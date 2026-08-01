# NFP — Documentation complète (App + Spécification serveur)

> **NaturallyForme Paiement (NFP)** — Application caisse offline-first pour Naturally Forme (compléments alimentaires, La Réunion).  
> Site vitrine : https://nf.tikilote.re/  
> Ce document décrit **tout ce qui existe dans l’app mobile** et propose une **architecture serveur** pour un VPS OVH (endpoints, sécurité, outils, sync).

**Version app :** `0.1.0` · **Schéma SQLite :** v3 · **Dernière mise à jour doc :** août 2026

---

## Table des matières

1. [Vue d’ensemble produit](#1-vue-densemble-produit)
2. [Stack technique mobile](#2-stack-technique-mobile)
3. [Architecture applicative](#3-architecture-applicative)
4. [Navigation et écrans](#4-navigation-et-écrans)
5. [Fonctionnalités métier (détail)](#5-fonctionnalités-métier-détail)
6. [Authentification, rôles et permissions](#6-authentification-rôles-et-permissions)
7. [Modèle de données SQLite (complet)](#7-modèle-de-données-sqlite-complet)
8. [Clés settings et JSON stockés](#8-clés-settings-et-json-stockés)
9. [Règles métier critiques](#9-règles-métier-critiques)
10. [Paiements et checkout](#10-paiements-et-checkout)
11. [File de synchronisation (état actuel)](#11-file-de-synchronisation-état-actuel)
12. [Audit et conformité tickets](#12-audit-et-conformité-tickets)
13. [Ce qui existe / ce qui manque](#13-ce-qui-existe--ce-qui-manque)
14. [Recommandations stack serveur (OVH VPS)](#14-recommandations-stack-serveur-ovh-vps)
15. [API REST proposée (endpoints)](#15-api-rest-proposée-endpoints)
16. [Schémas JSON (requêtes / réponses)](#16-schémas-json-requêtes--réponses)
17. [Sécurité serveur](#17-sécurité-serveur)
18. [Stratégie sync offline-first](#18-stratégie-sync-offline-first)
19. [Déploiement OVH (checklist)](#19-déploiement-ovh-checklist)
20. [Ordre de mise en production recommandé](#20-ordre-de-mise-en-production-recommandé)

---

## 1. Vue d’ensemble produit

| Aspect | Description |
|--------|-------------|
| **Cible** | Magasin physique Naturally Forme — caisse tablette + iPhone |
| **Mode** | **Offline-first** : toute la vente fonctionne sans réseau |
| **Cloud** | Prévu : sync des ventes, catalogue central, multi-magasins (pas encore codé côté HTTP) |
| **Monnaie** | EUR, montants en **centimes** (`*_cents` integer) |
| **TVA** | France retail : 0, 2.1, 5.5, 10, 20 % (TTC sur produits) |
| **Langue UI** | Français |
| **Brand** | Or `#C9A457`, Montserrat, fond crème — aligné nf.tikilote.re |

### Utilisateurs seed (démo)

| Code employé | Nom | Rôle | PIN (dev) |
|--------------|-----|------|-----------|
| MANU | Manuella | admin | 0000 |
| ROMAIN | Romain | admin | 0000 |
| MEDDY | Meddy | manager | 0000 |

⚠️ Changer les PIN et désactiver `allowPinSkip` avant production.

---

## 2. Stack technique mobile

| Couche | Technologie |
|--------|-------------|
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Langage | TypeScript strict |
| Navigation | React Navigation 7 (stack + menu latéral custom Modal) |
| UI | React Native Paper (Material 3), Reanimated, Linear Gradient |
| État serveur local | TanStack React Query 5 |
| État global léger | Zustand (auth, settings, drawer) |
| Base locale | expo-sqlite (`nfp.db`), migrations transactionnelles |
| DI | Container manuel + tokens string (`src/core/di/`) |
| Fonts | Montserrat (@expo-google-fonts) |
| Sécurité locale | expo-secure-store (session), SHA-256 PIN |
| HTTP | **axios présent dans package.json mais non utilisé** |

### Scripts

```bash
npm install
npm run typecheck
npm test
npx expo start
```

### Structure dossiers

```
src/
  application/     # bootstrap, AppProviders
  core/            # config, DI, errors, security (PIN, hash chain)
  database/        # schema, migrations, seed, client
  features/        # modules métier (auth, cart, checkout, products, …)
  navigation/      # Root, Auth, App, MainDrawer, side menu
  shared/          # composants UI, theme, audit, storage, utils
docs/              # ARCHITECTURE.md, DEPLOYMENT.md, ce fichier
```

---

## 3. Architecture applicative

### Clean architecture (feature-first)

Chaque feature suit en général :

```
features/<feature>/
  domain/          # types, règles pures
  data/            # *Repository.ts (interface) + Sqlite*Repository.ts
  presentation/    # screens, components, hooks
```

### Composition root

`src/application/bootstrap.ts` :

1. Ouvre SQLite + migrations + seed
2. Instancie tous les repositories SQLite
3. Enregistre dans le container DI (`TOKENS`)
4. Hydrate le store settings (nom magasin, thème)

### Tokens DI (`src/core/di/tokens.ts`)

| Token | Implémentation |
|-------|----------------|
| Database | SQLiteDatabase |
| AuthRepository | SqliteAuthRepository |
| UserRepository | SqliteUserRepository |
| CartRepository | SqliteCartRepository |
| OrderRepository | SqliteOrderRepository |
| CashClosingRepository | SqliteCashClosingRepository |
| ProductRepository | SqliteProductRepository |
| CategoryRepository | SqliteCategoryRepository |
| PromotionRepository | SqlitePromotionRepository |
| DashboardRepository | SqliteDashboardRepository |
| SettingsRepository | SqliteSettingsRepository |
| SyncRepository | SqliteSyncRepository |
| NoteRepository | SqliteNoteRepository |
| PaymentProvider | LocalPaymentProvider |
| AuditService | SqliteAuditService |
| SecureStorage | ExpoSecureStorage |
| KeyValueStorage | MemoryKeyValueStorage |

### Result pattern

Toutes les opérations repo retournent `Result<T>` :

```typescript
{ ok: true, value: T } | { ok: false, error: AppError }
```

---

## 4. Navigation et écrans

```
RootNavigator
├── session null → AuthNavigator → PinLogin
└── session ok → AppNavigator (Stack)
    ├── Main (MainDrawer + AppSideMenu overlay)
    │   ├── Dashboard
    │   ├── Pos (Caisse)
    │   ├── SalesHistory
    │   ├── CashClosing
    │   ├── Exports
    │   ├── ProductList
    │   ├── CategoryList
    │   ├── Inventory
    │   ├── Promotions
    │   ├── Members
    │   └── Settings
    ├── Checkout
    ├── SaleComplete { orderId, changeCents? }
    └── ProductForm { productId?, initialBarcode? }
```

### Menu latéral — visibilité par permission

| Écran | Permission requise |
|-------|-------------------|
| Dashboard, Pos, SalesHistory | Tous (cashier+) |
| CashClosing, Exports | `reports.view` |
| ProductList | Tous (gestion selon `inventory.manage`) |
| CategoryList, Inventory, Promotions | `inventory.manage` |
| Members | `users.manage` |
| Settings | `settings.manage` |

---

## 5. Fonctionnalités métier (détail)

### 5.1 Connexion (PinLogin)

- Liste employés actifs
- Saisie PIN 4 chiffres, soumission auto
- Bouton **Passer** (dev) : login sans PIN avec `devPin`
- Hero brand Naturally Forme sur tablette

### 5.2 Tableau de bord (Dashboard)

Widgets configurables (Settings) :

| Widget ID | Contenu |
|-----------|---------|
| `revenue_today` | CA jour (hero gradient) |
| `revenue_week` | CA semaine |
| `avg_basket` | Panier moyen |
| `tickets_today` | Nombre de tickets |
| `sales_chart` | Graphique ventes par heure |
| `top_products` | Top produits du jour |
| `stock_alerts` | Alertes stock faible |
| `team_notes` | Notes entre employés |

Actions rapides : Ouvrir la caisse, Historique.

### 5.3 Caisse (POS)

- Grille produits : top ventes / favoris / recherche / filtre catégorie (chips colorés)
- Scan caméra + saisie manuelle barcode/SKU
- Code-barres inconnu → créer produit ou associer à existant (managers)
- Panier : quantités, remise panier ou ligne (% ou €), promos catalogue
- Stock : blocage si stock 0 ; managers `sales.oversell` peuvent forcer
- Phone : barre panier + sheet ; tablette : split catalogue / panier
- Encaisser → Checkout

### 5.4 Checkout

- Mode **Single** ou **Mixte** (paiements fractionnés)
- Méthodes : cash, card, online, remote, transfer, amex, gift_card, store_credit
- Cash : saisie montant remis → calcul monnaie
- Gift card / avoir : champ référence
- Validation : somme paiements ≥ total TTC
- `completeSale` → ticket immuable + sync queue

### 5.5 Vente terminée (SaleComplete)

- Récap ticket, monnaie rendue
- Partage duplicata (texte)
- Nouvelle vente / retour dashboard

### 5.6 Historique des ventes

- Filtres : Aujourd’hui, Hier, Plage de dates
- Agrégats, graphique horaire, breakdown paiements
- Recherche par n° ticket
- Dialog détail : lignes, paiements, **annulation** (`sales.void`)

### 5.7 Clôture de caisse

- Période (jour)
- Fond de caisse, comptage, écart
- Breakdown par mode de paiement
- **Persistance** table `cash_closings`

### 5.8 Exports

- CSV ventes du jour (séparateur `;`)
- CSV catalogue produits
- Partage via API native Share (pas serveur)

### 5.9 Catalogue — Articles

- Liste, recherche, import CSV
- CRUD produit : SKU, barcode, nom, catégorie, prix TTC centimes, TVA, coût, stock, image locale, favori, rapide
- Soft delete (`is_active = 0`)

### 5.10 Catégories

- Nom, couleur (24 presets), ordre, actif/inactif

### 5.11 Inventaire

- Mouvements : entrée, sortie, adjustment + raison
- Table `inventory_movements` append-only

### 5.12 Promotions

- Règles par produit : remise en basis points (10000 = 100%)
- Dates début/fin, actif
- Stockées dans `settings.promotions.product_rules` (JSON)
- Appliquées auto à l’ajout au panier

### 5.13 Membres (employés)

- CRUD : code, nom, rôle, PIN, actif
- Protection dernier admin

### 5.14 Paramètres

- Nom magasin, adresse, téléphone, SIRET
- Thème : système / clair / sombre
- Horaires d’ouverture (7 jours)
- Widgets dashboard on/off
- Compteur sync pending (lecture seule)

### 5.15 Notes d’équipe (Dashboard)

- Note **équipe** (tous) ou **collègue** (direct)
- Liste : notes équipe + pour moi + envoyées par moi
- Suppression par l’auteur uniquement
- Table `employee_notes`

---

## 6. Authentification, rôles et permissions

### Rôles

| Rôle | Description |
|------|-------------|
| `cashier` | Caisse + dashboard |
| `manager` | + inventaire, rapports, void, oversell |
| `admin` | + paramètres, gestion utilisateurs |

### Permissions (`hasPermission(role, permission)`)

| Permission | cashier | manager | admin |
|------------|---------|---------|-------|
| `sales.create` | ✓ | ✓ | ✓ |
| `dashboard.view` | ✓ | ✓ | ✓ |
| `sales.refund` | | ✓ | ✓ |
| `sales.void` | | ✓ | ✓ |
| `sales.oversell` | | ✓ | ✓ |
| `inventory.manage` | | ✓ | ✓ |
| `reports.view` | | ✓ | ✓ |
| `reports.export` | | ✓ | ✓ |
| `settings.manage` | | | ✓ |
| `users.manage` | | | ✓ |

### PIN

- Format : 4 chiffres
- Stockage : `pin_salt` + `pin_hash` où `hash = SHA256(salt + ":" + pin)`
- Session : UUID token en Secure Store (`nfp.session.token`)
- Expiration session : `authenticatedAt + idleLogoutMs` (15 min app config)
- **Gap** : session non restaurée au cold start → toujours écran PIN
- **Gap** : `security.idle_logout_minutes` en DB non branché sur le hook idle

### Session (type actuel)

```typescript
{
  token: string;           // UUID aléatoire (pas JWT aujourd’hui)
  employee: Employee;
  authenticatedAt: string;   // ISO
  expiresAt: string;       // ISO
}
```

---

## 7. Modèle de données SQLite (complet)

### `users`

| Colonne | Type | Notes |
|---------|------|-------|
| id | TEXT PK | UUID |
| employee_code | TEXT UNIQUE | Majuscules |
| display_name | TEXT | |
| role | TEXT | admin \| manager \| cashier |
| pin_salt | TEXT | |
| pin_hash | TEXT | |
| is_active | INTEGER | 0/1 |
| created_at, updated_at | TEXT ISO | |

### `categories`

id, name, sort_order, color (hex), is_active, created_at, updated_at

### `products`

| Colonne | Notes |
|---------|-------|
| sku | UNIQUE |
| barcode | index, nullable |
| name | index |
| category_id | FK categories |
| price_cents | TTC |
| vat_rate | REAL (5.5, 20, …) |
| cost_cents | nullable |
| stock_quantity | REAL |
| is_favorite, is_quick | 0/1 |
| image_uri | chemin local device |
| is_active | soft delete |

### `customers` (table créée, **non utilisée UI**)

first_name, last_name, email, phone, loyalty_points, store_credit_cents, notes

### `cart` / `cart_lines`

- Un panier par `user_id` (getOrCreate)
- `global_discount_bps` (0–10000)
- Lignes : product_id, quantity, unit_price_cents (snapshot), discount_bps, vat_rate

### `orders` (**immuable** montants)

| Colonne | Notes |
|---------|-------|
| receipt_number | UNIQUE séquentiel |
| status | completed \| voided |
| subtotal_cents, discount_cents, vat_cents, total_cents | |
| previous_hash, receipt_hash | chaîne Article 286 |
| device_id, app_version | |
| customer_id | nullable, non utilisé |

### `order_lines`

product_id (nullable si produit supprimé), product_name, quantity, unit_price_cents, discount_cents, vat_rate, vat_cents, line_total_cents

### `payments`

method, amount_cents, provider, provider_reference, status (captured/failed/pending), created_at

### `refunds` (**table vide, non implémentée**)

### `inventory_movements` (append-only)

type: `sale` | `in` | `out` | `adjustment` — quantity signée pour ventes

### `settings`

key/value JSON ou string

### `audit_logs` (append-only)

action, entity_type, entity_id, payload_json, device_id, app_version, created_at

### `sync_queue`

| Colonne | Notes |
|---------|-------|
| entity_type | ex. `order` |
| entity_id | UUID entité |
| operation | ex. `create` |
| payload_json | JSON |
| status | pending \| synced \| failed |
| attempts, last_error | |

### `cash_closings` (migration v2)

user_id, period_start/end, opening/counted/expected/gap cents, total_cents, order_count, payment_breakdown_json, notes, created_at

### `employee_notes` (migration v3)

author_id, recipient_id (NULL = équipe), body, created_at

### `reports` (**non utilisée**)

---

## 8. Clés settings et JSON stockés

| Clé DB | Contenu |
|--------|---------|
| `store.name` | string |
| `theme.preference` | system \| light \| dark |
| `security.idle_logout_minutes` | number (non branché app) |
| `store.opening_hours` | JSON 7 jours |
| `dashboard.widgets` | JSON `[{ id, isEnabled }]` |
| `store.shop_info` | `{ address, phone, siret }` |
| `promotions.product_rules` | JSON `ProductPromotionRule[]` |

### ProductPromotionRule

```typescript
{
  productId: string;
  discountBps: number;      // 1000 = 10%
  isActive: boolean;
  startsAt?: string | null; // ISO
  endsAt?: string | null;
}
```

### DashboardWidgetId

`revenue_today`, `revenue_week`, `avg_basket`, `tickets_today`, `sales_chart`, `top_products`, `stock_alerts`, `team_notes`

---

## 9. Règles métier critiques

### Panier

- Remise ligne : basis points sur brut ligne
- Remise globale : basis points sur sous-total après remises lignes
- TVA : calculée sur TTC proportionnel au total
- Stock vérifié à l’ajout (sauf `bypassStockCheck`)

### Vente (`completeSale`)

1. Panier non vide, total > 0
2. Σ paiements ≥ total TTC
3. `PaymentProvider.startPayment` pour chaque ligne (simulation locale)
4. Transaction SQLite :
   - INSERT order + lines + payments
   - Décrément stock + `inventory_movements` type `sale`
   - Vide panier
5. Audit `sale`
6. Enqueue sync `order/create`

### Annulation (`voidOrder`)

- Permission `sales.void`
- status → `voided`
- Restaure stock
- Audit `void`
- **Pas encore sync serveur pour void**

### Chaîne de hash tickets (Article 286 prep)

```text
payload = JSON.stringify({
  receiptNumber, totalCents, userId, createdAt,
  lines: [{ productId, qty, total }]
})
receiptHash = SHA256(previousHash + "|" + payload)
premier ticket : previousHash = null → chaîne commence avec "GENESIS"
```

### Clôture caisse

```text
expectedCash = openingCash + ventes cash du jour
gap = countedCash - expectedCash
```

---

## 10. Paiements et checkout

### Méthodes (`PaymentMethod`)

| ID | Label UI | Notes |
|----|----------|-------|
| `cash` | Espèces | tenderedCents pour monnaie |
| `card` | Carte | simulé local |
| `online` | En ligne | simulé |
| `remote` | À distance | simulé |
| `transfer` | Virement | simulé |
| `amex` | American Express | simulé |
| `gift_card` | Carte cadeau | référence obligatoire |
| `store_credit` | Avoir client | référence obligatoire |
| `split` | — | UI only, rejeté par provider |

### LocalPaymentProvider

- id: `local`
- Délai simulé 180–280 ms
- Références : `CASH-{cartId}`, `GIFTCARD-…`, etc.

### CompleteSaleInput (app)

```typescript
{
  cartId: string;
  userId: string;
  payments: Array<{
    method: PaymentMethod;
    amountCents: number;
    tenderedCents?: number;
    reference?: string | null;
  }>;
  notes?: string | null;
}
```

---

## 11. File de synchronisation (état actuel)

### Ce qui est enqueue aujourd’hui

**Uniquement** après vente réussie :

```json
{
  "entityType": "order",
  "entityId": "<orderId>",
  "operation": "create",
  "payload": {
    "orderId": "uuid",
    "receiptNumber": 42,
    "totalCents": 5990,
    "createdAt": "2026-07-31T12:00:00.000Z"
  }
}
```

### Ce qui devrait être enqueue (recommandation serveur)

| entityType | operation | Quand |
|------------|-----------|-------|
| `order` | `create` | Vente |
| `order` | `void` | Annulation |
| `cash_closing` | `create` | Clôture |
| `product` | `create` / `update` | Catalogue (optionnel, pull préférable) |
| `inventory_movement` | `create` | Ajustement stock |
| `employee_note` | `create` | Note équipe |

### Worker app (à implémenter)

1. `listPending()` → POST batch au serveur
2. Idempotence par `orderId` / `receiptNumber` + `device_id`
3. `markSynced(id)` ou `markFailed(id, error)`
4. Retry avec backoff + `attempts` max

---

## 12. Audit et conformité tickets

### Actions audit loggées

`login`, `logout`, `login_failed`, `sale`, `void`, `product_create`, `product_update`, `product_deactivate`, `inventory_change`, `category_change`, `user_change`

### Champs audit

```typescript
{
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  // + device_id, app_version, created_at auto
}
```

---

## 13. Ce qui existe / ce qui manque

| ✅ Implémenté | ❌ Pas encore |
|-------------|---------------|
| POS complet offline | HTTP client / sync worker |
| Paiements mixtes | JWT / refresh tokens |
| Clôture caisse persistée | Restauration session au boot |
| Sync queue (enqueue) | Consumers sync + markSynced |
| Notes équipe | API serveur |
| Gift card / avoir (UI) | Vraie validation gift card serveur |
| Void ticket local | Refunds table + UI |
| Customers table | Fidélité / avoir client |
| Exports CSV locaux | Backoffice web |
| Hash chain tickets | Vérification serveur chaîne |
| Permissions RBAC | RBAC serveur aligné |

---

## 14. Recommandations stack serveur (OVH VPS)

### VPS OVH suggéré

| Spec | Minimum | Confortable |
|------|---------|-------------|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Stockage | 40 GB SSD | 80 GB |
| OS | **Ubuntu 24.04 LTS** | idem |
| Réseau | IP publique + **fail2ban** | + Cloudflare proxy |

### Stack recommandée (pragmatique pour ChatGPT / toi)

| Composant | Outil | Pourquoi |
|-----------|-------|----------|
| **API** | **Node.js 22 + Fastify** (ou NestJS si tu veux structure) | Même écosystème TS que l’app ; schemas Zod partagés possible |
| **ORM** | **Prisma** ou **Drizzle** | Migrations PostgreSQL, types |
| **DB** | **PostgreSQL 16** | JSON, contraintes, réplication future |
| **Cache / queue** | **Redis 7** | Sessions, rate limit, jobs sync |
| **Jobs async** | **BullMQ** (Redis) | Retry sync, exports, emails |
| **Reverse proxy** | **Caddy** ou **Nginx** | TLS auto (Let’s Encrypt), HTTP/2 |
| **Process manager** | **PM2** ou **systemd** | Tu utilises déjà PM2 pour Metro |
| **Monitoring** | **Uptime Kuma** + logs JSON | VPS léger |
| **Backups** | `pg_dump` cron + stockage OVH Object Storage | |
| **CI** | GitHub Actions → SSH deploy | Comme NFP Metro |

### Alternatives valides

- **Python FastAPI + SQLAlchemy** si tu préfères Python sur le VPS
- **PostgreSQL + PostgREST** pour CRUD rapide (moins flexible métier)
- **Supabase** : évite ops DB mais moins contrôle OVH « tout sur un VPS »

### Domaine suggéré

```text
api.nf.tikilote.re     → API REST NFP
admin.nf.tikilote.re   → backoffice (phase 2)
```

---

## 15. API REST proposée (endpoints)

Base URL : `https://api.nf.tikilote.re/v1`

Toutes les réponses erreur :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description lisible",
    "details": {}
  }
}
```

### 15.1 Auth

| Méthode | Path | Description |
|---------|------|-------------|
| POST | `/auth/pin` | Login code employé + PIN → tokens |
| POST | `/auth/logout` | Révoque session |
| POST | `/auth/refresh` | Refresh JWT |
| GET | `/auth/me` | Employé courant |

**POST `/auth/pin`**

```json
// Body
{
  "employeeCode": "ROMAIN",
  "pin": "1234",
  "deviceId": "ios-abc123",
  "appVersion": "0.1.0"
}

// Response 200
{
  "accessToken": "eyJ...",
  "refreshToken": "uuid-or-jwt",
  "expiresIn": 900,
  "employee": {
    "id": "uuid",
    "employeeCode": "ROMAIN",
    "displayName": "Romain",
    "role": "admin"
  }
}
```

⚠️ Le serveur doit stocker PIN avec **bcrypt/argon2** (pas SHA256 seul) — à la migration depuis l’app, re-hash au premier login ou reset PIN admin.

### 15.2 Sync (priorité haute)

| Méthode | Path | Description |
|---------|------|-------------|
| POST | `/sync/push` | Batch événements depuis app |
| GET | `/sync/pull` | Delta catalogue + settings depuis `since` |
| GET | `/sync/status` | Santé / version catalogue |

**POST `/sync/push`**

```json
// Headers: Authorization: Bearer <accessToken>
// Body
{
  "deviceId": "ios-abc123",
  "appVersion": "0.1.0",
  "events": [
    {
      "localId": "sync-queue-uuid",
      "entityType": "order",
      "entityId": "order-uuid",
      "operation": "create",
      "payload": { /* OrderSyncPayload complet — voir §16 */ },
      "createdAt": "2026-07-31T12:00:00.000Z"
    }
  ]
}

// Response 200
{
  "results": [
    {
      "localId": "sync-queue-uuid",
      "status": "accepted",
      "serverId": "order-uuid"
    },
    {
      "localId": "...",
      "status": "duplicate",
      "message": "Order already exists"
    },
    {
      "localId": "...",
      "status": "rejected",
      "message": "Invalid receipt chain"
    }
  ]
}
```

**GET `/sync/pull?since=2026-07-31T00:00:00Z&storeId=default`**

```json
{
  "serverTime": "2026-07-31T19:00:00Z",
  "catalogVersion": 128,
  "products": [ /* ProductDTO[] */ ],
  "categories": [ /* CategoryDTO[] */ ],
  "promotions": [ /* PromotionRuleDTO[] */ ],
  "settings": { /* store subset */ },
  "deletedProductIds": [],
  "deletedCategoryIds": []
}
```

### 15.3 Orders (lecture / admin)

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/orders` | Liste filtrée (date, store, user) |
| GET | `/orders/{id}` | Détail ticket |
| GET | `/orders/receipt/{receiptNumber}` | Par n° ticket |
| POST | `/orders/{id}/void` | Void serveur (miroir app) |

### 15.4 Products & categories

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/products` | Liste + pagination + search |
| POST | `/products` | Création (admin) |
| PUT | `/products/{id}` | Mise à jour |
| PATCH | `/products/{id}/stock` | Ajustement stock |
| GET | `/categories` | Liste |
| CRUD | `/categories/{id}` | Admin |

### 15.5 Cash closings

| Méthode | Path | Description |
|---------|------|-------------|
| POST | `/cash-closings` | Enregistrer clôture |
| GET | `/cash-closings` | Historique |

### 15.6 Employee notes

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/notes` | Notes pour user (team + direct) |
| POST | `/notes` | Créer |
| DELETE | `/notes/{id}` | Auteur seulement |

### 15.7 Employees (admin)

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/employees` | Liste |
| POST | `/employees` | Créer + PIN |
| PUT | `/employees/{id}` | Modifier |
| POST | `/employees/{id}/pin` | Reset PIN |

### 15.8 Reports / exports

| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/reports/sales` | Agrégats période |
| GET | `/reports/sales/export.csv` | Export CSV |

### 15.9 Health

| Méthode | Path |
|---------|------|
| GET | `/health` |
| GET | `/health/db` |

---

## 16. Schémas JSON (requêtes / réponses)

### OrderSyncPayload (recommandé pour sync — **plus complet que l’enqueue actuel**)

L’app devra être étendue pour envoyer ce payload complet :

```typescript
interface OrderSyncPayload {
  id: string;
  receiptNumber: number;
  userId: string;
  employeeCode: string;
  customerId: string | null;
  status: 'completed';
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  notes: string | null;
  previousHash: string | null;
  receiptHash: string;
  createdAt: string;
  deviceId: string;
  appVersion: string;
  lines: Array<{
    id: string;
    productId: string | null;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    discountCents: number;
    vatRate: number;
    vatCents: number;
    lineTotalCents: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountCents: number;
    provider: string | null;
    providerReference: string | null;
    status: string;
    createdAt: string;
  }>;
}
```

### ProductDTO (sync pull)

```typescript
{
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  priceCents: number;
  vatRate: number;
  costCents: number | null;
  stockQuantity: number;
  isFavorite: boolean;
  isQuick: boolean;
  imageUrl: string | null;   // URL HTTPS, pas file:// local
  isActive: boolean;
  updatedAt: string;
}
```

### CategoryDTO

```typescript
{
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isActive: boolean;
  updatedAt: string;
}
```

### CashClosingSyncPayload

```typescript
{
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  openingCashCents: number;
  countedCashCents: number;
  expectedCashCents: number;
  gapCents: number;
  totalCents: number;
  orderCount: number;
  paymentBreakdown: Array<{ method: string; totalCents: number }>;
  notes: string | null;
  createdAt: string;
  deviceId: string;
}
```

### EmployeeNoteDTO

```typescript
{
  id: string;
  authorId: string;
  authorName: string;
  recipientId: string | null;
  recipientName: string | null;
  body: string;
  createdAt: string;
}
```

---

## 17. Sécurité serveur

### Transport

- **TLS 1.3** obligatoire (Caddy + Let’s Encrypt)
- HSTS, pas de HTTP plain
- Option : Cloudflare en proxy (DDoS, WAF rules)

### Authentification API

1. **JWT access token** courte durée (15 min)
2. **Refresh token** rotatif en DB ou Redis
3. Claims JWT : `sub` (user id), `role`, `storeId`, `deviceId`
4. Rate limit login : 5 essais / 15 min / IP + code employé

### PIN côté serveur

- **Argon2id** ou bcrypt cost ≥ 12
- Ne jamais logger le PIN
- Lockout après N échecs

### Autorisation

- Middleware RBAC identique aux permissions app
- Admin routes : `settings.manage`, `users.manage`
- Sync push : `sales.create` minimum

### Sync / idempotence

- Contrainte UNIQUE `(store_id, receipt_number)` ou `(device_id, local_order_id)`
- Vérifier `receiptHash` et chaîne `previous_hash` serveur
- Rejeter replay (même payload, différent id)

### Données

- PostgreSQL : utilisateur app sans SUPERUSER
- Chiffrement disque VPS (OVH)
- Backups chiffrés Object Storage
- Logs sans PAN carte (jamais stocker numéro carte complet)

### Headers recommandés

```http
Authorization: Bearer <jwt>
X-Device-Id: ios-abc123
X-App-Version: 0.1.0
X-Store-Id: reunion-main
Content-Type: application/json
```

### CORS

- Mobile Expo : pas de CORS classique
- Backoffice futur : whitelist `admin.nf.tikilote.re`

---

## 18. Stratégie sync offline-first

### Principes

1. **L’app est source de vérité locale** pendant la vente
2. **Le serveur est source de vérité catalogue** (pull périodique)
3. **Les ventes poussent** (push) avec idempotence
4. **Pas de blocage caisse** si API down

### Flux app (à coder)

```text
[Vente locale] → sync_queue pending
     ↓ (réseau OK)
POST /sync/push
     ↓
accepted → markSynced
rejected → markFailed + message UI Settings
     ↓
GET /sync/pull (toutes les 15 min ou au login)
     ↓
Upsert products/categories en SQLite local
```

### Catalogue images

- App stocke `image_uri` local aujourd’hui
- Serveur : S3/OVH Object Storage + URL dans `imageUrl`
- App : télécharger au pull, cache fichier local

### Multi-magasin (futur)

- Ajouter `store_id` sur toutes les tables serveur
- JWT claim `storeId`
- Un VPS peut servir plusieurs magasins

---

## 19. Déploiement OVH (checklist)

```bash
# 1. VPS Ubuntu 24.04 — utilisateur non-root, SSH clé only
# 2. Firewall
ufw allow 22,80,443/tcp
ufw enable

# 3. Docker (optionnel mais recommandé)
docker compose up -d   # postgres, redis, api

# 4. PostgreSQL
createdb nfp
# user nfp_app avec mot de passe fort

# 5. API
git clone <repo-serveur>
npm ci && npm run build
pm2 start dist/main.js --name nfp-api

# 6. Caddy
api.nf.tikilote.re {
  reverse_proxy localhost:3000
}

# 7. Cron backup
0 3 * * * pg_dump nfp | gzip > /backup/nfp-$(date +\%F).sql.gz
```

### Variables d’environnement serveur

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://nfp_app:xxx@localhost:5432/nfp
REDIS_URL=redis://localhost:6379
JWT_SECRET=<64-bytes-random>
JWT_REFRESH_SECRET=<64-bytes-random>
STORE_ID=reunion-main
CORS_ORIGINS=https://admin.nf.tikilote.re
S3_BUCKET=nfp-assets
S3_ENDPOINT=https://s3.gra.io.cloud.ovh.net
```

---

## 20. Ordre de mise en production recommandé

| Phase | Serveur | App mobile |
|-------|---------|------------|
| **1** | PostgreSQL + `/health` + `/auth/pin` JWT | Client HTTP + login API optionnel |
| **2** | `/sync/push` orders complets + idempotence | Worker sync + payload complet |
| **3** | `/sync/pull` products/categories | Upsert catalogue local |
| **4** | `/cash-closings` POST | Enqueue clôture |
| **5** | `/notes` CRUD | Sync notes (optionnel) |
| **6** | Backoffice web lecture ventes | — |
| **7** | Gift card validation API | Checkout réel |
| **8** | Refunds | UI remboursement |

---

## Annexe A — Config app (`APP_CONFIG`)

```typescript
{
  name: 'NaturallyForme Paiement',
  shortName: 'NFP',
  version: '0.1.0',
  idleLogoutMs: 900000,
  pinLength: 4,
  devPin: '0000',
  allowPinSkip: true,
  tabletMinWidth: 768,
  database: { name: 'nfp.db' }
}
```

## Annexe B — Fichiers clés à lire dans le repo

| Fichier | Contenu |
|---------|---------|
| `src/database/schema.ts` | Schéma SQL initial |
| `src/database/migrations/*` | v2 cash_closings, v3 employee_notes |
| `src/features/checkout/data/SqliteOrderRepository.ts` | Vente, void, hash |
| `src/features/cart/data/SqliteCartRepository.ts` | Panier, stock |
| `src/features/authentication/domain/permissions.ts` | RBAC |
| `src/features/sync/data/SqliteSyncRepository.ts` | Queue |
| `src/shared/services/audit/AuditService.ts` | Audit |
| `docs/ARCHITECTURE.md` | Architecture détaillée |
| `docs/DEPLOYMENT.md` | CI/CD Metro VPS |

## Annexe C — Prompt suggéré pour ChatGPT (serveur)

Copier ce bloc + ce document entier :

```text
Tu es architecte backend. Contexte : app caisse React Native offline-first NFP (Naturally Forme, La Réunion). PostgreSQL sur VPS OVH Ubuntu 24.04. Stack : Node 22 + Fastify + Prisma + Redis + BullMQ + Caddy TLS.

Lis la spec complète ci-dessus. Génère :
1. Schéma Prisma PostgreSQL aligné sur les tables SQLite (§7) + store_id
2. Code Fastify routes §15 avec validation Zod
3. Service sync push idempotent pour orders (§16 OrderSyncPayload)
4. Vérification chaîne receiptHash (§9)
5. docker-compose.yml (api, postgres, redis, caddy)
6. Scripts déploiement PM2 + backup pg_dump

Sécurité : JWT 15min, refresh rotatif, Argon2 PIN, rate limit, pas de données carte en clair.
```

---

*Document généré pour le projet NFP — Naturally Forme / tikilote.re*
