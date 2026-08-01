# NFP Mobile — Architecture complète

> **Naturally Forme Paiement (NFP)** — Documentation d'architecture mobile générée par analyse du code source.  
> **Version app :** `0.1.0` · **Schéma SQLite :** v5 · **Date :** août 2026  
> **Branche analysée :** `cursor/backend-source-of-truth-991e`

Ce document couvre l'architecture, les fonctionnalités, les écrans, les modèles, les appels API, le design system et la roadmap implicite. **Aucun code modifié** — documentation seule.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Arborescence complète](#2-arborescence-complète)
3. [Technologies et dépendances](#3-technologies-et-dépendances)
4. [Architecture applicative](#4-architecture-applicative)
5. [Points d'entrée et bootstrap](#5-points-dentrée-et-bootstrap)
6. [Navigation](#6-navigation)
7. [State management](#7-state-management)
8. [Providers React](#8-providers-react)
9. [Couche API (HTTP)](#9-couche-api-http)
10. [Stockage local](#10-stockage-local)
11. [Authentification](#11-authentification)
12. [Thèmes et Design System](#12-thèmes-et-design-system)
13. [Internationalisation (i18n)](#13-internationalisation-i18n)
14. [Fonctionnalités existantes (liste exhaustive)](#14-fonctionnalités-existantes-liste-exhaustive)
15. [Tableau des écrans](#15-tableau-des-écrans)
16. [Appels API (référence Fastify)](#16-appels-api-référence-fastify)
17. [Modèles TypeScript](#17-modèles-typescript)
18. [Modèles métier et schéma SQLite](#18-modèles-métier-et-schéma-sqlite)
19. [Services et repositories](#19-services-et-repositories)
20. [Flux utilisateur](#20-flux-utilisateur)
21. [Graphe de dépendances](#21-graphe-de-dépendances)
22. [TODO / FIXME / roadmap implicite](#22-todo--fixme--roadmap-implicite)
23. [Annexes](#23-annexes)

---

## 1. Vue d'ensemble

| Aspect | Valeur |
|--------|--------|
| **Produit** | Caisse POS offline-first pour magasin physique Naturally Forme (La Réunion) |
| **Cible** | Tablettes Android + iPhone (Expo Go SDK 54) |
| **Monnaie** | EUR, montants en **centimes** (`*_cents`) |
| **TVA** | France retail : 0, 2.1, 5.5, 10, 20 % |
| **Langue UI** | Français (hardcodé, pas de lib i18n) |
| **Backend** | **Non déployé** — client HTTP codé, endpoints appelés si backend joignable |
| **Source de vérité** | Serveur (futur) ; app = cache + file sync + snapshots temporaires |

### Chaîne de démarrage

```text
index.ts → App.tsx → AppProviders → bootstrap() → RootNavigator
```

---

## 2. Arborescence complète

```text
/
├── App.tsx
├── index.ts
├── package.json
├── docs/
├── src/
│   ├── application/
│   │   ├── AppProviders.tsx      # Providers React + bootstrap UI
│   │   └── bootstrap.ts          # Composition root DI
│   ├── core/
│   │   ├── compliance/           # deviceContext, receiptHash, syncPayload
│   │   ├── config/appConfig.ts
│   │   ├── di/                   # container, tokens
│   │   ├── errors/AppError.ts
│   │   ├── http/ApiClient.ts
│   │   ├── security/             # pin, hash
│   │   ├── sync/                 # SyncOperation, SyncVersions, ConflictResolver
│   │   └── types/Result.ts
│   ├── database/
│   │   ├── client.ts
│   │   ├── schema.ts             # SCHEMA_VERSION = 5
│   │   ├── seed.ts
│   │   ├── transaction.ts
│   │   └── migrations/
│   │       ├── 001_initial.ts
│   │       ├── 002_cash_closings.ts
│   │       ├── 003_employee_notes.ts
│   │       ├── 004_admin_fields.ts
│   │       └── 005_compliance.ts
│   ├── features/
│   │   ├── authentication/       # PIN login, employés, RBAC
│   │   ├── cart/                 # POS, panier
│   │   ├── checkout/             # Encaissement, historique, clôture
│   │   ├── compliance/           # Snapshots, validation
│   │   ├── customers/          # README placeholder
│   │   ├── dashboard/            # Tableau de bord, widgets
│   │   ├── inventory/          # README placeholder
│   │   ├── notes/                # Notes équipe
│   │   ├── payments/             # PaymentProvider port
│   │   ├── products/             # Catalogue, catégories, stock
│   │   ├── promotions/           # Règles promo
│   │   ├── reports/              # Exports CSV
│   │   ├── settings/             # Hub admin + orchestrateurs
│   │   └── sync/                 # File sync, device, serveur
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── AppNavigator.tsx
│   │   ├── MainDrawer.tsx
│   │   ├── AppSideMenu.tsx
│   │   ├── drawerStore.ts
│   │   └── types.ts
│   └── shared/
│       ├── components/           # UI partagée
│       ├── hooks/
│       ├── services/             # audit, activity, receipt, storage
│       ├── theme/                # Design tokens
│       └── utils/
```

### Pattern feature (clean architecture)

```text
features/<feature>/
  domain/           # Types, règles pures
  data/             # Repositories, Local/Remote data sources
  presentation/     # screens/, components/, hooks/, store/
  services/         # (optionnel)
```

---

## 3. Technologies et dépendances

### Runtime principal

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Expo SDK** | ~54.0.36 | Framework, modules natifs |
| **React** | 19.1.0 | UI |
| **React Native** | 0.81.5 | Mobile |
| **TypeScript** | ~5.9.2 | Typage strict |

### Navigation

| Lib | Version | Usage |
|-----|---------|-------|
| `@react-navigation/native` | ^7.3.14 | Navigation core |
| `@react-navigation/native-stack` | ^7.18.6 | Stack navigators |
| `react-native-screens` | ~4.16.0 | Native screens |
| `react-native-safe-area-context` | ~5.6.0 | Safe areas |
| `react-native-gesture-handler` | ~2.28.0 | Gestures |

### State & data

| Lib | Version | Usage |
|-----|---------|-------|
| **Zustand** | ^5.0.14 | Auth, settings, drawer (3 stores) |
| **TanStack React Query** | ^5.101.4 | Cache requêtes async (screens) |
| **expo-sqlite** | ~16.0.10 | Base locale `nfp.db` |
| **expo-secure-store** | ~15.0.8 | Session token |

### UI & animation

| Lib | Version | Usage |
|-----|---------|-------|
| **react-native-paper** | ^5.15.3 | Material 3 components |
| **react-native-reanimated** | ~4.1.1 | Animations |
| **expo-linear-gradient** | ~15.0.8 | Gradients brand |
| `@shopify/flash-list` | 2.0.2 | Listes performantes |
| `react-native-svg` | 15.12.1 | Graphiques |
| `@expo/vector-icons` | ^15.0.3 | Icônes |

### Expo modules

| Module | Usage |
|--------|-------|
| `expo-camera` | Scan code-barres POS |
| `expo-image-picker` | Photos produits |
| `expo-document-picker` | Import CSV |
| `expo-file-system` | Fichiers locaux |
| `expo-crypto` | SHA-256 hash chain |
| `expo-font` + `@expo-google-fonts/montserrat` | Typographie |

### Formulaires & validation

| Lib | Usage |
|-----|-------|
| `react-hook-form` | Formulaires admin |
| `@hookform/resolvers` | Résolveurs |
| `zod` | Validation schémas |

### Utilitaires

| Lib | Usage |
|-----|-------|
| `date-fns` | Dates (locale `fr`) |
| `uuid` | IDs |
| `axios` | **Dans package.json mais NON utilisé** — HTTP via `fetch` dans `ApiClient` |

### Non utilisés

| Lib | Statut |
|-----|--------|
| Redux | Absent |
| MMKV | Absent |
| AsyncStorage | Absent (Secure Store + SQLite) |
| NativeWind | Absent (StyleSheet + Paper) |
| i18next / react-intl | Absent |

### Dev

| Lib | Usage |
|-----|-------|
| Jest + jest-expo | Tests unitaires |
| @testing-library/react-native | Tests composants |

---

## 4. Architecture applicative

### Principes

| Backend (futur) | Application mobile |
|-----------------|-------------------|
| Source de vérité métier | UI + validation locale |
| Règles officielles | Cache SQLite |
| Paramètres admin | File de synchronisation |
| Audit / archive légale | Événements temporaires + snapshots |

### Couches

```text
Écrans / composants (React Native)
    ↓ hooks, React Query, Zustand
Repositories (orchestrateurs — ports DI)
    ↓
LocalDataSource (SQLite)  +  RemoteDataSource (API)
    ↓
ApiClient partagé  →  Backend NFP (à développer)
```

### Repository pattern Local + Remote

| Repository orchestrateur | Local | Remote |
|--------------------------|-------|--------|
| `AdminSettingsRepositoryImpl` | `LocalAdminSettingsDataSource` | `RemoteAdminSettingsDataSource` |
| `ActivityRepositoryImpl` | `LocalActivityDataSource` | `RemoteActivityDataSource` |
| `ServerRepositoryImpl` | métadonnées locales | `RemoteServerDataSource` |
| File sync | `LocalSyncQueueDataSource` | `RemoteSyncDataSource` |

### Repositories SQLite directs (cache métier)

| Repository | Rôle |
|------------|------|
| `SqliteAuthRepository` | PIN, session |
| `SqliteUserRepository` | Employés |
| `SqliteCartRepository` | Panier éphémère |
| `SqliteOrderRepository` | Ventes immuables, hash, sync enqueue |
| `SqliteCashClosingRepository` | Clôtures immuables |
| `SqliteProductRepository` | Catalogue |
| `SqliteCategoryRepository` | Catégories |
| `SqlitePromotionRepository` | Promotions |
| `SqliteDashboardRepository` | Agrégats dashboard |
| `SqliteSettingsRepository` | Settings legacy (nom, thème) |
| `SqliteNoteRepository` | Notes équipe |
| `SqliteDeviceRepository` | DeviceId, logs sync |
| `SqliteComplianceRepository` | Snapshots conformité |
| `ProductImportExportRepository` | CSV catalogue |

### Result pattern

Toutes les opérations repository retournent :

```typescript
type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

### DI Container

- Fichier : `src/core/di/container.ts`
- Tokens : `src/core/di/tokens.ts` (string tokens)
- Enregistrement : `src/application/bootstrap.ts`

---

## 5. Points d'entrée et bootstrap

| Fichier | Rôle |
|---------|------|
| `index.ts` | `registerRootComponent(App)` — entry Expo |
| `App.tsx` | `<AppProviders />` |
| `AppProviders.tsx` | Fonts, bootstrap async, providers, `RootNavigator` |
| `bootstrap.ts` | SQLite, migrations, DI, hydrate settings, `refreshOnStartup()` |

### Séquence bootstrap

1. `container.clear()`
2. `openDatabase()` + migrations v5 + seed
3. Instanciation repositories locaux
4. `ApiClient` avec URL depuis `LocalAdminSettingsDataSource`
5. Remote data sources
6. Orchestrateurs (admin, activity, server)
7. Repositories métier (orders, products, cart…)
8. `container.registerInstance(TOKENS.*)`
9. Hydrate `useSettingsStore` (thème, nom magasin)
10. `refreshOnStartup()` — sync silencieuse si backend OK

### État initial UI

- Loading : « Initialisation NFP… » jusqu'à fonts + bootstrap
- Erreur bootstrap affichée en overlay

---

## 6. Navigation

### Hiérarchie

```text
RootNavigator
├── session null → AuthNavigator
│   └── PinLogin
└── session ok → AppNavigator (Stack)
    ├── Main → MainDrawer (Stack interne + AppSideMenu Modal)
    │   ├── Dashboard
    │   ├── Pos
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
    ├── ProductForm { productId?, initialBarcode? }
    ├── AdminStore … AdminDeveloper (14 écrans admin)
```

### Menu latéral (`AppSideMenu`)

Modal overlay contrôlé par `useDrawerStore`. Sections :

| Section | Routes |
|---------|--------|
| Accueil | Dashboard |
| Vente | Pos, SalesHistory, CashClosing |
| Rapports | Exports |
| Catalogue | ProductList, CategoryList, Inventory |
| Administration | Settings |

**Note :** `Promotions` et `Members` sont dans `MainDrawer` mais **pas** dans le menu latéral — accessibles via navigation directe ou dashboard.

### Visibilité menu (permissions)

| Route | Permission |
|-------|------------|
| Dashboard, Pos, SalesHistory, ProductList | Tous (cashier+) |
| CashClosing, Exports | `reports.view` |
| CategoryList, Inventory | `inventory.manage` |
| Settings | `settings.manage` |

### Types navigation

Fichier : `src/navigation/types.ts`

- `AuthStackParamList` : `PinLogin`
- `MainParamList` : 11 routes principales
- `AppStackParamList` : Main + Checkout + SaleComplete + ProductForm + 14 Admin*
- `RootStackParamList` : Auth | App

### Animations

`animation: 'none'` sur stacks — pas de flash blanc entre écrans.

---

## 7. State management

### Zustand (3 stores)

| Store | Fichier | Contenu |
|-------|---------|---------|
| `useAuthStore` | `authStore.ts` | `session`, `isBootstrapping`, `touchActivity()` |
| `useSettingsStore` | `settingsStore.ts` | `themePreference`, `storeName`, hydrate |
| `useDrawerStore` | `drawerStore.ts` | `isOpen`, `activeRoute`, open/close |

### React Query

- **Provider** : `AppProviders` — `staleTime: 30s`, `retry: 1`
- **Usage** : quasi tous les écrans pour données async (repos SQLite + admin bundle)
- **Hooks dédiés** :
  - `useAdminBundle.ts`
  - `useSyncSummary.ts`
  - `useAutoLockMs.ts`

### Pas de Redux, pas de Context métier global

Données métier = repositories via DI + React Query cache.

---

## 8. Providers React

### Arborescence

```text
GestureHandlerRootView
  → SafeAreaProvider
    → QueryClientProvider
      → AppThemeProvider (PaperProvider)
        → RootNavigator
```

| Provider | Fichier | Rôle |
|----------|---------|------|
| `GestureHandlerRootView` | gesture-handler | Gestes |
| `SafeAreaProvider` | safe-area-context | Insets |
| `QueryClientProvider` | react-query | Cache async |
| `AppThemeProvider` | `ThemeProvider.tsx` | Paper MD3 light/dark |

### PaymentProvider (non-React)

`LocalPaymentProvider` — classe DI, simulation paiements 180–280 ms.

---

## 9. Couche API (HTTP)

### Client

**Fichier :** `src/core/http/ApiClient.ts`

- `fetch` natif (pas axios)
- Base URL : `AdminSettingsBundle.sync.apiUrl` (défaut `https://api.nf.tikilote.re/v1`)
- Bearer token depuis Secure Store (`nfp.session.token`)
- Retry, timeout, hook refresh 401 (préparé)
- Méthodes : `get`, `post`, `put`, `delete`

### Quand l'API est appelée

| Contexte | Condition |
|----------|-----------|
| `runSyncNow()` / `refreshOnStartup()` | Backend joignable + pas `simulateOffline` |
| Admin Server screen | Health + backup |
| Admin Activity screen | Pull audit logs serveur |
| Admin Sync screen | Sync manuelle |

**Toute la vente POS fonctionne sans API** — SQLite uniquement.

### Pas d'appels API pour

- Login / PIN (100 % local)
- Catalogue CRUD (local)
- Panier, checkout (local)
- Historique ventes (local)

---

## 10. Stockage local

### SQLite (`nfp.db`)

| Aspect | Détail |
|--------|--------|
| Driver | `expo-sqlite` |
| Version schéma | **5** |
| Migrations | 001–005 transactionnelles |
| Seed | Employés démo, produits, catégories |

### Secure Store (expo-secure-store)

| Clé | Contenu |
|-----|---------|
| `nfp.session.token` | JSON session (token UUID + employee) |
| `nfp.theme.preference` | (config key, usage partiel) |

### Memory KeyValueStorage

Cache mémoire DI — pas de persistance AsyncStorage.

### Fichiers locaux

| Usage | Module |
|-------|--------|
| Photos produits | `expo-image-picker` → `image_uri` en DB |
| Export CSV | `expo-file-system` + Share API |
| Import CSV | `expo-document-picker` |

---

## 11. Authentification

### Méthodes supportées

| Méthode | Statut |
|---------|--------|
| PIN 4 chiffres | ✅ Implémenté |
| Biométrie | ❌ Absent |
| JWT / API login | ❌ Absent (préparé côté ApiClient) |
| Passer (dev) | ✅ `allowPinSkip: true` |

### Flux login

1. Cold start → `session` null → `PinLoginScreen`
2. Liste employés actifs (`SqliteUserRepository`)
3. Saisie PIN → `SqliteAuthRepository.loginWithPin()`
4. Vérif : `SHA256(salt + ":" + pin)` vs `pin_hash` SQLite
5. Création session UUID → Secure Store + Zustand
6. `RootNavigator` → `AppNavigator`

### Session

```typescript
type AuthSession = {
  token: string;           // UUID (pas JWT)
  employee: Employee;
  authenticatedAt: string;
  expiresAt: string;       // authenticatedAt + idleLogoutMs
};
```

### Rôles et permissions

| Rôle | Permissions |
|------|-------------|
| `cashier` | `sales.create`, `dashboard.view` |
| `manager` | + void, refund, oversell, inventory, reports |
| `admin` | + `settings.manage`, `users.manage` |

Fichier : `src/features/authentication/domain/permissions.ts`

### Sécurité

| Feature | Statut |
|---------|--------|
| Idle logout 15 min | ✅ `useIdleLogout` |
| Session restore cold start | ❌ Toujours écran PIN |
| `autoLockMinutes` admin | Partiellement branché via `useAutoLockMs` |
| PIN force change flag | Champ `forcePinChange` sur Employee |

---

## 12. Thèmes et Design System

### Alignement brand

Site référence : https://nf.tikilote.re/  
Palette or Naturally Forme, fond crème, Montserrat.

### Couleurs (`src/shared/theme/colors.ts`)

| Token | Light | Usage |
|-------|-------|-------|
| `primary` | `#C9A457` | Or brand, CTA, icônes actives |
| `primaryDark` | `#B88E3A` | Hover, accents |
| `primaryLight` | `#E7D3A2` | Gradients |
| `background` | `#FAF8F5` | Fond app |
| `backgroundSecondary` | `#F5F2EC` | Sections |
| `surface` | `#FFFFFF` | Cartes |
| `text` | `#2E2A26` | Texte principal |
| `textSecondary` | `#6F6A64` | Sous-titres |
| `border` | `#E7E2D8` | Bordures |
| `success` | `#3CB371` | Positif |
| `error` | `#E74C3C` | Erreur |
| `warning` | `#F39C12` | Alerte |
| `info` | `#3A86FF` | Info |

**Dark mode :** `background #1A1814`, `surface #24211C`, or conservé.

**Gradient brand :** `['#E7D3A2', '#C9A457', '#B88E3A']`

### Spacing (`spacing.ts`)

| Token | px |
|-------|-----|
| `xxs` | 4 |
| `xs` | 8 |
| `sm` | 12 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 48 |

### Touch targets

| Token | px |
|-------|-----|
| `min` | 48 |
| `comfortable` | 56 |
| `pinKey` | 72 |

### Radius (`radii`)

| Token | px |
|-------|-----|
| `input` | 12 |
| `button` | 14 |
| `card` | 18 |
| `xl` | 24 |
| `pill` | 999 |

### Typography (`typography.ts`)

**Famille :** Montserrat (300–700 via expo-google-fonts)

| Style | Taille | Poids |
|-------|--------|-------|
| `h1` | 32 | Bold |
| `h2` | 24 | SemiBold |
| `h3` | 20 | SemiBold |
| `body` | 16 | Regular |
| `caption` | 14 | Regular |
| `button` | 15 | SemiBold |
| `amount` | 36 | Bold |
| `money` | 18 | SemiBold |
| `pin` | 28 | SemiBold, letterSpacing 8 |
| `tagline` | 13 | Medium, uppercase |

### Shadows

`sm`, `md`, `lg` — elevation 2/6/12

### Composants UI partagés

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `Screen` | `Screen.tsx` | Wrapper écran safe area |
| `AppHeader` | `AppHeader.tsx` | Header + menu |
| `BrandCard` | `BrandCard.tsx` | Carte surface brand |
| `BrandHero` | `BrandHero.tsx` | Hero gradient login |
| `PinPad` | `PinPad.tsx` | Clavier PIN |
| `AnimatedPressable` | `AnimatedPressable.tsx` | Boutons animés |
| `LoadingOverlay` | `LoadingOverlay.tsx` | Chargement |
| `QueryErrorPanel` | `QueryErrorPanel.tsx` | Erreurs React Query |
| `DatePickerField` | `DatePickerField.tsx` | Date native |
| `Shimmer` / `skeletons` | | États loading |

### Composants feature

| Feature | Composants |
|---------|------------|
| Cart | `PosProductTile`, `CartLineRow`, `BarcodeScannerModal` |
| Checkout | `OrderDetailDialog` |
| Dashboard | `MetricCard`, `EmployeeNotesPanel`, `SalesSparkBars` |
| Products | `ProductListItem`, `CategoryColorPicker`, `ProductImageField` |
| Settings | `AdminScreenShell`, `LogoImageField`, `SyncStatusCard` |

### Paper theme

`createPaperTheme(mode)` mappe tokens brand → MD3 (`paperTheme.ts`).

### Pour aligner Swagger / Backoffice

Exporter ces tokens CSS :

```css
--nfp-primary: #C9A457;
--nfp-primary-dark: #B88E3A;
--nfp-background: #FAF8F5;
--nfp-surface: #FFFFFF;
--nfp-text: #2E2A26;
--nfp-text-secondary: #6F6A64;
--nfp-border: #E7E2D8;
--nfp-success: #3CB371;
--nfp-error: #E74C3C;
--nfp-radius-card: 18px;
--nfp-radius-button: 14px;
--font-family: 'Montserrat', sans-serif;
```

---

## 13. Internationalisation (i18n)

| Aspect | Statut |
|--------|--------|
| Lib i18n | **Aucune** (pas i18next, react-intl) |
| Langue UI | Français hardcodé dans composants |
| Dates | `date-fns` locale `fr` + `toLocaleString('fr-FR')` |
| Settings `language` | Champ `fr` dans `StoreExtendedSettings` (non branché UI) |
| Pluriels / traductions | Non |

---

## 14. Fonctionnalités existantes (liste exhaustive)

### Authentication

| Feature | Statut |
|---------|--------|
| Login PIN 4 chiffres | ✅ |
| Liste employés actifs | ✅ |
| Soumission auto PIN complet | ✅ |
| Passer (dev skip PIN) | ✅ |
| Logout | ✅ |
| Idle auto-lock | ✅ |
| Biométrie | ❌ |
| Session restore boot | ❌ |
| API login JWT | ❌ |

### Employés / Membres

| Feature | Statut |
|---------|--------|
| Liste membres | ✅ |
| CRUD employé (admin) | ✅ |
| PIN create/change | ✅ |
| Rôles admin/manager/cashier | ✅ |
| Protection dernier admin | ✅ |
| Couleur utilisateur | ✅ |
| forcePinChange flag | ✅ (champ, UI partielle) |

### Dashboard

| Feature | Statut |
|---------|--------|
| Widgets configurables | ✅ |
| CA jour / semaine | ✅ |
| Panier moyen | ✅ |
| Tickets jour | ✅ |
| Graphique ventes/heure | ✅ |
| Top produits | ✅ |
| Alertes stock | ✅ |
| Notes équipe | ✅ |
| Actions rapides caisse/historique | ✅ |
| Carte statut sync | ✅ |

### Caisse (POS)

| Feature | Statut |
|---------|--------|
| Grille produits | ✅ |
| Recherche nom/SKU/barcode | ✅ |
| Filtre catégorie (chips colorés) | ✅ |
| Favoris / rapides | ✅ |
| Scan caméra barcode | ✅ |
| Saisie manuelle barcode | ✅ |
| Barcode inconnu → créer/associer produit | ✅ |
| Panier quantités | ✅ |
| Remise ligne (% basis points) | ✅ |
| Remise globale panier | ✅ |
| Promos auto à l'ajout | ✅ |
| Blocage stock 0 | ✅ |
| Oversell (manager) | ✅ |
| Layout phone (sheet panier) | ✅ |
| Layout tablette (split) | ✅ |
| Encaisser → Checkout | ✅ |

### Panier

| Feature | Statut |
|---------|--------|
| Add item | ✅ |
| Remove line | ✅ |
| Update quantity | ✅ |
| Discount ligne | ✅ |
| Discount global | ✅ |
| Clear cart | ✅ |
| Notes panier | ✅ |
| Calcul TVA TTC | ✅ |
| Un panier par userId | ✅ |

### Checkout / Paiement

| Feature | Statut |
|---------|--------|
| Mode single paiement | ✅ |
| Mode mixte (split) | ✅ |
| Cash + monnaie | ✅ |
| Card (simulé) | ✅ |
| Online, remote, transfer | ✅ |
| Amex | ✅ |
| Gift card + référence | ✅ |
| Store credit + référence | ✅ |
| Validation Σ paiements ≥ total | ✅ |
| Ticket immuable | ✅ |
| Hash chain receipt | ✅ |
| Stock decrement | ✅ |
| Sync enqueue SALE_CREATE | ✅ |
| TPE réel (Stripe Terminal…) | ❌ |

### Vente terminée

| Feature | Statut |
|---------|--------|
| Récap ticket | ✅ |
| Monnaie rendue | ✅ |
| Partage duplicata texte | ✅ |
| Nouvelle vente | ✅ |

### Historique ventes

| Feature | Statut |
|---------|--------|
| Filtre Aujourd'hui | ✅ |
| Filtre Hier | ✅ |
| Plage dates + heures | ✅ |
| Agrégats | ✅ |
| Graphique horaire | ✅ |
| Breakdown paiements | ✅ |
| Recherche n° ticket | ✅ |
| Dialog détail | ✅ |
| Annulation void | ✅ |
| Sync SALE_CANCEL | ✅ |

### Clôture caisse

| Feature | Statut |
|---------|--------|
| Période jour | ✅ |
| Fond de caisse | ✅ |
| Comptage | ✅ |
| Écart calculé | ✅ |
| Breakdown paiements | ✅ |
| Persistance cash_closings | ✅ |
| Sync CASH_CLOSING_CREATE | ✅ |
| Snapshot conformité | ✅ |

### Exports

| Feature | Statut |
|---------|--------|
| CSV ventes jour | ✅ |
| CSV catalogue | ✅ |
| Partage natif Share | ✅ |
| Export serveur | ❌ |

### Catalogue — Articles

| Feature | Statut |
|---------|--------|
| Liste + recherche | ✅ |
| CRUD produit | ✅ |
| SKU, barcode, nom | ✅ |
| Catégorie, prix TTC, TVA | ✅ |
| Coût, stock | ✅ |
| Photo locale | ✅ |
| Favori, rapide | ✅ |
| Soft delete (is_active) | ✅ |
| Stats ventes produit | ✅ |
| Import CSV | ✅ |
| Export CSV | ✅ |

### Catégories

| Feature | Statut |
|---------|--------|
| CRUD | ✅ |
| Couleur (24 presets) | ✅ |
| Ordre tri | ✅ |
| Actif/inactif | ✅ |

### Inventaire

| Feature | Statut |
|---------|--------|
| Mouvements entrée/sortie/adjustment | ✅ |
| Raison | ✅ |
| inventory_movements append-only | ✅ |
| Sync INVENTORY_UPDATE | ❌ (pas enqueue auto) |

### Promotions

| Feature | Statut |
|---------|--------|
| Règles produit (% basis points) | ✅ |
| Dates début/fin | ✅ |
| Admin promos screen | ✅ |
| Promo catégorie / montant fixe | ✅ (types, UI partielle) |
| Sync PROMOTION_UPDATE | ❌ |

### Notes équipe

| Feature | Statut |
|---------|--------|
| Note équipe (tous) | ✅ |
| Note directe collègue | ✅ |
| Liste dashboard | ✅ |
| Suppression auteur | ✅ |
| Sync notes | ❌ |

### Paramètres admin

| Feature | Statut |
|---------|--------|
| Hub magasin | ✅ |
| POS settings | ✅ |
| Paiements | ✅ |
| Taxes TVA | ✅ |
| Tickets/receipts | ✅ |
| Inventaire settings | ✅ |
| Promotions admin | ✅ |
| Employés admin | ✅ |
| Appareils / deviceId | ✅ |
| Sync status + sync now | ✅ |
| Serveur & sauvegardes | ✅ |
| Import/export CSV | ✅ |
| Historique activité | ✅ |
| Mode développeur | ✅ |
| Diagnostics conformité | ✅ |

### Sync

| Feature | Statut |
|---------|--------|
| File sync_queue | ✅ |
| SyncCoordinator push/pull | ✅ |
| Versions sync | ✅ |
| simulateOffline | ✅ |
| Startup refresh | ✅ |
| Backend déployé | ❌ |

### Conformité

| Feature | Statut |
|---------|--------|
| Triggers inaltérabilité v5 | ✅ |
| Hash chain tickets | ✅ |
| compliance_snapshots | ✅ |
| daily_snapshots table | ✅ (auto-open jour : ❌) |
| Audit enrichi | ✅ |
| Enveloppes sync compliance | ✅ |
| Validation locale | ✅ |
| Vérification serveur | ❌ |

### Customers / Fidélité

| Feature | Statut |
|---------|--------|
| Table customers SQLite | ✅ (schéma) |
| UI customers | ❌ |
| Avoir client UI | ❌ (checkout référence seulement) |
| Points fidélité | ❌ |

### Refunds

| Feature | Statut |
|---------|--------|
| Table refunds SQLite | ✅ (vide) |
| UI remboursement | ❌ |

---

## 15. Tableau des écrans

| Écran | Route | Stack | Permission | Composants clés | Data source | API (si backend) |
|-------|-------|-------|------------|-----------------|-------------|------------------|
| **PinLogin** | `PinLogin` | Auth | — | PinPad, BrandHero | SqliteAuth, SqliteUser | — |
| **Dashboard** | `Dashboard` | Main | cashier+ | MetricCard, EmployeeNotesPanel, SalesSparkBars, SyncStatusCard | SqliteDashboard, SqliteNote | pull (indirect sync) |
| **Pos** | `Pos` | Main | cashier+ | PosProductTile, CartLineRow, BarcodeScannerModal | SqliteCart, SqliteProduct | — |
| **SalesHistory** | `SalesHistory` | Main | cashier+ | OrderDetailDialog | SqliteOrder | — |
| **CashClosing** | `CashClosing` | Main | reports.view | — | SqliteCashClosing, SqliteOrder | — |
| **Exports** | `Exports` | Main | reports.view | — | SqliteOrder, ProductImportExport | — |
| **ProductList** | `ProductList` | Main | cashier+ | ProductListItem | SqliteProduct | — |
| **CategoryList** | `CategoryList` | Main | inventory.manage | CategoryColorPicker | SqliteCategory | — |
| **Inventory** | `Inventory` | Main | inventory.manage | — | SqliteProduct | — |
| **Promotions** | `Promotions` | Main | inventory.manage | — | SqlitePromotion | — |
| **Members** | `Members` | Main | users.manage* | MemberRowSkeleton | SqliteUser | — |
| **Settings** | `Settings` | Main | settings.manage | AdminScreenShell | AdminSettingsRepository | — |
| **Checkout** | `Checkout` | App | cashier+ | — | SqliteCart, SqliteOrder, PaymentProvider | — |
| **SaleComplete** | `SaleComplete` | App | cashier+ | — | SqliteOrder | — |
| **ProductForm** | `ProductForm` | App | inventory.manage | ProductImageField | SqliteProduct | — |
| **AdminStore** | `AdminStore` | App | settings.manage | LogoImageField | AdminSettingsRepository | pull settings |
| **AdminPos** | `AdminPos` | App | settings.manage | AdminScreenShell | AdminSettingsRepository | pull settings |
| **AdminPayments** | `AdminPayments` | App | settings.manage | — | AdminSettingsRepository | pull settings |
| **AdminTaxes** | `AdminTaxes` | App | settings.manage | — | AdminSettingsRepository | pull settings |
| **AdminReceipts** | `AdminReceipts` | App | settings.manage | LogoImageField | AdminSettingsRepository | pull settings |
| **AdminInventory** | `AdminInventory` | App | settings.manage | — | AdminSettingsRepository | pull settings |
| **AdminPromotions** | `AdminPromotions` | App | settings.manage | — | AdminSettingsRepository, SqlitePromotion | pull settings |
| **AdminEmployees** | `AdminEmployees` | App | settings.manage | — | SqliteUser | pull employees |
| **AdminDevices** | `AdminDevices` | App | settings.manage | — | SqliteDeviceRepository | — |
| **AdminSync** | `AdminSync` | App | settings.manage | SyncStatusCard | SyncCoordinator | health, push, pull |
| **AdminServerBackups** | `AdminServerBackups` | App | settings.manage | — | ServerRepositoryImpl | health, status, backup |
| **AdminImportExport** | `AdminImportExport` | App | settings.manage | — | ProductImportExportRepository | — |
| **AdminActivity** | `AdminActivity` | App | settings.manage | — | ActivityRepositoryImpl | audit/logs, activity |
| **AdminDeveloper** | `AdminDeveloper` | App | admin + dev mode | — | ComplianceValidation, SqliteCompliance | — |

\* Members accessible via MainDrawer ; menu latéral ne liste pas Promotions/Members explicitement.

---

## 16. Appels API (référence Fastify)

**Base URL par défaut :** `https://api.nf.tikilote.re/v1`  
**Auth header :** `Authorization: Bearer {session.token}` (UUID local, pas JWT encore)

### Tableau endpoints appelés par le mobile

| Méthode | Path | Fichier source | Body / Query | Quand | Statut backend |
|---------|------|----------------|--------------|-------|----------------|
| GET | `/health` | RemoteSyncDataSource, RemoteServerDataSource, syncCoordinator | — | Sync, statut serveur | À implémenter |
| GET | `/sync/status` | RemoteSyncDataSource | — | Optionnel | À implémenter |
| POST | `/sync/push` | RemoteSyncDataSource | `{ events: SyncPushEvent[] }` | SyncCoordinator | À implémenter |
| POST | `/sync/pull` | RemoteSyncDataSource | `SyncVersions` | SyncCoordinator | À implémenter |
| GET | `/sync/pull` | RemoteSyncDataSource (fallback) | version query params | Si POST échoue | À implémenter |
| GET | `/server/status` | RemoteServerDataSource | — | Server screen | À implémenter |
| GET | `/status` | RemoteServerDataSource (fallback) | — | Server screen | À implémenter |
| POST | `/backup` | RemoteServerDataSource | `{ source: 'nfp-mobile' }` | Backup button | À implémenter |
| POST | `/server/backup` | RemoteServerDataSource (fallback) | idem | Backup button | À implémenter |
| GET | `/audit/logs?limit=&offset=` | RemoteActivityDataSource | query | Activity screen | À implémenter |
| GET | `/activity?limit=&offset=` | RemoteActivityDataSource (fallback) | query | Activity screen | À implémenter |

### Endpoints documentés mais NON appelés par l'app

| Méthode | Path | Usage futur |
|---------|------|-------------|
| POST | `/auth/pin` | Login API JWT |
| GET | `/health/db` | Health DB serveur |
| GET | `/products` | CRUD direct (pull sync préféré) |
| POST | `/orders` | CRUD direct (push sync préféré) |
| GET | `/categories` | Pull catalogue |
| POST | `/cash-closings` | Alternative à sync push |
| CRUD | `/notes` | Sync notes équipe |

### SyncPushEvent (body push)

```typescript
{
  localId: string;
  entityType: string;      // sale, cash_closing, settings, …
  entityId: string;
  operation: string;       // SALE_CREATE, SALE_CANCEL, CASH_CLOSING_CREATE, …
  payload: Record<string, unknown>;  // inclut deviceId, payloadHash, localVersion
  createdAt: string;
}
```

### SyncPullRequest (body pull)

```typescript
{
  settingsVersion: number;
  productsVersion: number;
  inventoryVersion: number;
  employeesVersion: number;
  promotionsVersion: number;
  activityVersion: number;
}
```

### SyncPullResponse (attendu)

```typescript
{
  serverTime: string;
  settingsVersion?: number;
  productsVersion?: number;
  // … versions
  products?: unknown[];
  categories?: unknown[];
  promotions?: unknown[];
  employees?: unknown[];
  settings?: Partial<AdminSettingsBundle>;
  auditLogs?: SyncAuditLogDto[];
  deletedProductIds?: string[];
  deletedCategoryIds?: string[];
}
```

### Mapping Fastify recommandé

| Route mobile | Route Fastify suggérée | Priorité |
|--------------|------------------------|----------|
| GET `/health` | `GET /v1/health` | P0 |
| POST `/sync/push` | `POST /v1/sync/push` | P0 |
| POST `/sync/pull` | `POST /v1/sync/pull` | P0 |
| GET `/server/status` | `GET /v1/server/status` | P1 |
| POST `/backup` | `POST /v1/backup` | P1 |
| GET `/audit/logs` | `GET /v1/audit/logs` | P2 |
| POST `/auth/pin` | `POST /v1/auth/pin` | P2 |

---

## 17. Modèles TypeScript

### Authentication (`features/authentication/domain/types.ts`)

```typescript
type UserRole = 'admin' | 'manager' | 'cashier';

type Permission =
  | 'sales.create' | 'sales.refund' | 'sales.void' | 'sales.oversell'
  | 'inventory.manage' | 'reports.view' | 'reports.export'
  | 'settings.manage' | 'users.manage' | 'dashboard.view';

type Employee = {
  id: string;
  employeeCode: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  userColor: string | null;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  forcePinChange: boolean;
};

type AuthSession = {
  token: string;
  employee: Employee;
  authenticatedAt: string;
  expiresAt: string;
};

type PinLoginInput = { employeeCode: string; pin: string };
```

### Products (`features/products/domain/types.ts`)

```typescript
const VAT_RATES = [0, 2.1, 5.5, 10, 20] as const;
type VatRate = typeof VAT_RATES[number] | number;

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priceCents: number;
  vatRate: number;
  costCents: number | null;
  stockQuantity: number;
  isFavorite: boolean;
  isQuick: boolean;
  imageUri: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreateProductInput = { /* sku?, barcode?, name, priceCents, vatRate, … */ };
type UpdateProductInput = { id: string; /* … */ };
type AdjustStockInput = {
  productId: string;
  userId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string | null;
};
```

### Cart (`features/cart/domain/types.ts`)

```typescript
type CartLine = {
  id: string;
  cartId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceCents: number;
  discountBps: number;
  vatRate: number;
  lineTotalCents: number;
  notes: string | null;
};

type Cart = {
  id: string;
  userId: string;
  customerId: string | null;
  globalDiscountBps: number;
  notes: string | null;
  updatedAt: string;
  lines: CartLine[];
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  itemCount: number;
};
```

### Checkout / Order (`features/checkout/domain/types.ts`)

```typescript
type OrderStatus = 'completed' | 'voided';

type OrderLine = {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  vatRate: number;
  vatCents: number;
  lineTotalCents: number;
};

type OrderPayment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amountCents: number;
  provider: string | null;
  providerReference: string | null;
  status: 'captured' | 'failed' | 'pending';
  createdAt: string;
};

type Order = {
  id: string;
  receiptNumber: number;
  userId: string;
  customerId: string | null;
  status: OrderStatus;
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
  lines: OrderLine[];
  payments: OrderPayment[];
};

type CompleteSaleInput = {
  cartId: string;
  userId: string;
  payments: SalePaymentInput[];
  notes?: string | null;
};
```

### Cash closing (`features/checkout/domain/cashClosing.ts`)

```typescript
type CashClosingRecord = {
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
  paymentBreakdown: PaymentBreakdown[];
  notes: string | null;
  createdAt: string;
};
```

### Payments (`features/payments/domain/PaymentProvider.ts`)

```typescript
type PaymentMethod =
  | 'cash' | 'card' | 'online' | 'remote' | 'transfer'
  | 'amex' | 'gift_card' | 'store_credit' | 'split';

type PaymentRequest = {
  amountCents: number;
  currency: 'EUR';
  method: PaymentMethod;
  orderId: string;
  reference: string;
};

interface PaymentProvider {
  readonly id: string;
  startPayment(request: PaymentRequest): Promise<PaymentResult>;
  cancelPayment?(providerReference: string): Promise<void>;
}
```

### Promotions (`features/promotions/domain/types.ts`)

```typescript
type PromotionKind = 'percent' | 'fixed_amount';
type PromotionTargetType = 'product' | 'category';

type PromotionRule = {
  id: string;
  kind: PromotionKind;
  targetType: PromotionTargetType;
  productId: string | null;
  categoryId: string | null;
  discountBps: number;
  discountCents: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type ProductPromotionRule = {
  productId: string;
  discountBps: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};
```

### Notes (`features/notes/domain/types.ts`)

```typescript
type EmployeeNote = {
  id: string;
  authorId: string;
  authorName: string;
  recipientId: string | null;
  recipientName: string | null;
  body: string;
  createdAt: string;
};
```

### Dashboard (`features/dashboard/domain/types.ts`)

```typescript
type DashboardSnapshot = {
  generatedAt: string;
  metrics: DashboardMetric[];
  topProducts: TopProductStat[];
  salesPerHour: HourlySalePoint[];
  inventoryAlerts: string[];
};
```

### Settings admin (`features/settings/domain/adminSettings.ts`)

```typescript
type AdminSettingsBundle = {
  storeExtended: StoreExtendedSettings;
  pos: PosSettings;
  payments: PaymentsSettings;
  taxes: TaxSettings;
  receipt: ReceiptSettings;
  inventory: InventorySettings;
  sync: SyncMetaSettings;
  developer: DeveloperSettings;
};

type SyncMetaSettings = {
  apiUrl: string;
  backendVersion: string | null;
  catalogVersion: number;
  lastSuccessfulSyncAt: string | null;
  backendAvailable: boolean;
  newCatalogAvailable: boolean;
  newDataAvailable: boolean;
  simulateOffline: boolean;
};
```

### Sync (`features/sync/domain/`)

```typescript
type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  payloadJson: string;
  status: 'pending' | 'synced' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

type SyncPushEvent = { localId, entityType, entityId, operation, payload, createdAt };
type SyncPullResponse = { serverTime, products?, categories?, settings?, … };
```

### Compliance (`features/compliance/domain/snapshots.ts`)

```typescript
type SnapshotType = 'sale' | 'sale_void' | 'cash_closing' | …;
type ComplianceSnapshot = {
  id: string;
  snapshotType: SnapshotType;
  entityId: string;
  payloadJson: string;
  payloadHash: string;
  deviceId: string;
  employeeId: string | null;
  appVersion: string;
  createdAt: string;
  synced: boolean;
};

type DailySnapshot = {
  id: string;
  businessDate: string;
  status: DailySnapshotStatus;
  openingCashCents: number | null;
  closingCashCents: number | null;
  ordersCount: number;
  salesAmountCents: number;
  snapshotHash: string;
  payloadJson: string;
  createdAt: string;
  closedAt: string | null;
};
```

### Core

```typescript
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

type SyncVersions = {
  settingsVersion: number;
  productsVersion: number;
  inventoryVersion: number;
  employeesVersion: number;
  promotionsVersion: number;
  activityVersion: number;
};
```

---

## 18. Modèles métier et schéma SQLite

### Tables (schéma v5)

| Table | Modèle métier | Append-only | Notes |
|-------|---------------|-------------|-------|
| `users` | Employee | soft delete | PIN hash |
| `categories` | Category | soft delete | |
| `products` | Product | soft delete | |
| `customers` | Customer | — | **Non utilisé UI** |
| `cart` | Cart | ephemeral | 1 par user |
| `cart_lines` | CartLine | ephemeral | |
| `orders` | Order / Sale | **immutable** | triggers v5 |
| `order_lines` | OrderLine | **immutable** | |
| `payments` | OrderPayment | **immutable** | |
| `refunds` | Refund | — | **Vide, non implémenté** |
| `inventory_movements` | StockMovement | append-only | |
| `settings` | key/value JSON | — | legacy + admin |
| `audit_logs` | AuditEntry | append-only | |
| `sync_queue` | SyncQueueItem | — | |
| `cash_closings` | CashClosing | immutable | migration v2 |
| `employee_notes` | EmployeeNote | delete auteur | migration v3 |
| `compliance_snapshots` | ComplianceSnapshot | append-only | migration v5 |
| `daily_snapshots` | DailySnapshot | — | migration v5 |
| `reports` | — | — | **Non utilisé** |

### Entités métier → Prisma (mapping suggéré)

| Mobile | PostgreSQL suggéré |
|--------|-------------------|
| `Employee` (users) | `Employee` |
| `Category` | `Category` |
| `Product` | `Product` |
| `Cart` / `CartLine` | Pas sync (local only) |
| `Order` | `Sale` ou `Order` |
| `OrderLine` | `SaleLine` |
| `OrderPayment` | `Payment` |
| `CashClosingRecord` | `CashClosing` |
| `EmployeeNote` | `EmployeeNote` |
| `InventoryMovement` | `InventoryMovement` |
| `ComplianceSnapshot` | `ComplianceSnapshot` |
| `DailySnapshot` | `DailySnapshot` |
| `AuditLog` | `AuditLog` |
| `SyncQueueItem` | Pas serveur (queue locale) |
| `Customer` | `Customer` (futur) |

### Sync operations (`SyncOperation`)

```typescript
SALE_CREATE, SALE_CANCEL,
PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE,
INVENTORY_UPDATE, EMPLOYEE_UPDATE,
SETTINGS_UPDATE, PAYMENT_CREATE,
PROMOTION_UPDATE, CASH_CLOSING_CREATE
```

---

## 19. Services et repositories

### Services partagés

| Service | Fichier | Rôle |
|---------|---------|------|
| `AuditService` | `shared/services/audit/AuditService.ts` | Log append-only |
| `activityTracker` | `shared/services/activity/activityTracker.ts` | Track activité locale |
| `buildReceiptText` | `shared/services/receipt/buildReceiptText.ts` | Texte ticket partage |
| `ExpoSecureStorage` | `shared/services/storage/SecureStorage.ts` | Secure Store |
| `MemoryKeyValueStorage` | `shared/services/storage/KeyValueStorage.ts` | Cache mémoire |

### Services feature

| Service | Fichier | Rôle |
|---------|---------|------|
| `SyncCoordinator` | `sync/services/syncCoordinator.ts` | Push/pull central |
| `ComplianceValidationService` | `compliance/services/ComplianceValidationService.ts` | Valide hash chain |
| `LocalPaymentProvider` | `payments/data/LocalPaymentProvider.ts` | Simule paiements |

### Interfaces repository (ports DI)

| Token | Interface |
|-------|-----------|
| `AuthRepository` | `IAuthRepository` |
| `UserRepository` | `IUserRepository` |
| `CartRepository` | `ICartRepository` |
| `OrderRepository` | `IOrderRepository` |
| `CashClosingRepository` | `ICashClosingRepository` |
| `ProductRepository` | `IProductRepository` |
| `CategoryRepository` | `ICategoryRepository` |
| `PromotionRepository` | `IPromotionRepository` |
| `DashboardRepository` | `IDashboardRepository` |
| `SettingsRepository` | `ISettingsRepository` |
| `AdminSettingsRepository` | `IAdminSettingsRepository` |
| `ActivityHistoryRepository` | `IActivityHistoryRepository` |
| `ServerInfoRepository` | `IServerInfoRepository` |
| `ImportExportRepository` | `IImportExportRepository` |
| `NoteRepository` | `INoteRepository` |
| `DeviceRepository` | `IDeviceRepository` |
| `ComplianceRepository` | `IComplianceRepository` |
| `SyncRepository` | `LocalSyncQueueDataSource` |
| `PaymentProvider` | `PaymentProvider` interface |

---

## 20. Flux utilisateur

### Flux principal vente

```text
Launch (Expo)
    ↓
Initialisation NFP… (fonts + bootstrap SQLite)
    ↓
PinLogin (sélection employé + PIN ou Passer)
    ↓
Dashboard (ou menu → Caisse)
    ↓
Pos — recherche / scan / grille produits
    ↓
Panier — quantités, remises
    ↓
Encaisser
    ↓
Checkout — choix mode(s) paiement, validation
    ↓
[SQLite transaction]
  orders + lines + payments
  stock decrement
  hash chain
  compliance snapshot
  sync_queue SALE_CREATE
    ↓
SaleComplete — récap, monnaie, partage
    ↓
Nouvelle vente → Pos
```

### Flux annulation

```text
SalesHistory → filtre date → ticket → détail dialog
    ↓
Annuler (permission sales.void)
    ↓
voidOrder → status voided, restore stock
    ↓
audit + snapshot + SALE_CANCEL enqueue
```

### Flux clôture

```text
CashClosing → période jour
    ↓
Fond caisse + comptage
    ↓
Calcul écart (expected vs counted)
    ↓
Sauvegarder → cash_closings + CASH_CLOSING_CREATE
```

### Flux sync (background)

```text
refreshOnStartup() ou AdminSync "Synchroniser"
    ↓
GET /health
    ↓
POST /sync/push (pending queue)
    ↓
POST /sync/pull (versions)
    ↓
Upsert cache local (settings, produits, employés…)
```

### Flux admin settings

```text
Settings hub → section (Magasin, POS, …)
    ↓
Modifier → AdminSettingsRepository.set*
    ↓
Local SQLite + SETTINGS_UPDATE enqueue
    ↓
Sync push au prochain runSyncNow
```

---

## 21. Graphe de dépendances

### Boot → UI

```text
index.ts
  └── App.tsx
        └── AppProviders
              ├── bootstrap.ts
              │     ├── database/client
              │     ├── core/di/container
              │     ├── core/http/ApiClient
              │     ├── features/*/data/*Repository*
              │     └── syncCoordinator.refreshOnStartup
              └── RootNavigator
                    ├── AuthNavigator → PinLoginScreen
                    └── AppNavigator
                          ├── MainDrawer → *Screen (11)
                          └── Checkout, SaleComplete, ProductForm, Admin*
```

### OrderRepository dépendances

```text
SqliteOrderRepository
  ├── SqliteCartRepository
  ├── LocalPaymentProvider
  ├── AuditService
  ├── LocalSyncQueueDataSource
  └── SqliteComplianceRepository
```

### AdminSettings orchestrateur

```text
AdminSettingsRepositoryImpl
  ├── LocalAdminSettingsDataSource (SQLite)
  ├── RemoteAdminSettingsDataSource (extract pull)
  ├── RemoteSyncDataSource (pull)
  └── LocalSyncQueueDataSource (enqueue)
```

### Écran → données (pattern typique)

```text
Screen
  └── useQuery / useMutation
        └── container.resolve(TOKENS.*Repository)
              └── Sqlite* ou *RepositoryImpl
                    └── SQLite / ApiClient
```

---

## 22. TODO / FIXME / roadmap implicite

### Commentaires code

**Aucun `TODO`, `FIXME`, ou `HACK` trouvé dans `src/`** (recherche exhaustive août 2026).

### Gaps documentés (roadmap implicite)

| Priorité | Gap | Fichiers / zone |
|----------|-----|-----------------|
| P0 | Déployer backend Fastify (`/health`, `/sync/push`, `/sync/pull`) | RemoteSyncDataSource |
| P0 | Idempotence push + vérif receiptHash serveur | Backend |
| P1 | Session restore depuis SecureStore au cold start | SqliteAuthRepository, authStore |
| P1 | `POST /auth/pin` JWT + refresh token | ApiClient refresh hook prêt |
| P1 | Daily snapshot auto-open première vente du jour | SqliteOrderRepository |
| P2 | UI Customers / fidélité | table `customers` existe |
| P2 | Refunds UI + table usage | `refunds` vide |
| P2 | Sync notes équipe | SqliteNoteRepository |
| P2 | Enqueue PRODUCT_UPDATE / INVENTORY_UPDATE auto | Product/Inventory repos |
| P2 | Gift card validation serveur | Checkout |
| P2 | TPE réel (Stripe Terminal, Worldline) | PaymentProvider port |
| P3 | Biométrie | Auth |
| P3 | i18n lib (actuellement FR hardcodé) | — |
| P3 | Multi-magasin `store_id` | Backend |
| P3 | Images produits cloud (S3 OVH) | Pull sync |
| P3 | Backoffice web | — |
| Dev | `allowPinSkip: true` → false prod | appConfig |
| Dev | Changer PIN seed `0000` | seed.ts |

### Ordre mise en production recommandé

| Phase | Serveur | App |
|-------|---------|-----|
| 1 | PostgreSQL + `/health` + `/auth/pin` | Client HTTP ✅ |
| 2 | `/sync/push` orders + idempotence | Worker ✅ |
| 3 | `/sync/pull` catalogue | Upsert ✅ |
| 4 | `/cash-closings` | Enqueue ✅ |
| 5 | Notes CRUD | Optionnel |
| 6 | Backoffice lecture ventes | — |
| 7 | Gift card API | Checkout |
| 8 | Refunds | UI |

---

## 23. Annexes

### A. Configuration app (`APP_CONFIG`)

```typescript
{
  name: 'NaturallyForme Paiement',
  shortName: 'NFP',
  version: '0.1.0',
  idleLogoutMs: 900000,      // 15 min
  pinLength: 4,
  devPin: '0000',
  allowPinSkip: true,
  tabletMinWidth: 768,
  database: { name: 'nfp.db' },
  secureStorageKeys: {
    sessionToken: 'nfp.session.token',
    themePreference: 'nfp.theme.preference',
  },
}
```

### B. Employés seed (démo)

| Code | Nom | Rôle | PIN |
|------|-----|------|-----|
| MANU | Manuella | admin | 0000 |
| ROMAIN | Romain | admin | 0000 |
| MEDDY | Meddy | manager | 0000 |

### C. Barcodes seed (tests scan)

`3000000000001`, `3000000000002`, `3000000000006`

### D. Documents liés

| Document | Contenu |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture Local/Remote détaillée |
| [COMPLIANCE.md](COMPLIANCE.md) | Conformité POS française |
| [NFP_APP_AND_SERVER_SPEC.md](NFP_APP_AND_SERVER_SPEC.md) | Spec app + API serveur OVH |
| [CHANGELOG_RECENT.md](CHANGELOG_RECENT.md) | Refactors récents |
| [DEPLOYMENT.md](DEPLOYMENT.md) | CI/CD Metro VPS |

### E. Commandes

```bash
npm install
npm run typecheck
npm test
npx expo start
```

---

*Document généré par analyse statique du dépôt NFP — Naturally Forme / tikilote.re*
