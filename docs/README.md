# Documentation NFP

Index de la documentation du projet **Naturally Forme Paiement** (application caisse React Native + backend à développer).

| Document | Contenu |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture mobile définitive : Local/Remote, sync, cache, DI |
| [COMPLIANCE.md](COMPLIANCE.md) | Préparation conformité POS française (inaltérabilité, hash, audit, snapshots) |
| [CHANGELOG_RECENT.md](CHANGELOG_RECENT.md) | Synthèse des refactors récents (admin, serveur, architecture, compliance) |
| [NFP_APP_AND_SERVER_SPEC.md](NFP_APP_AND_SERVER_SPEC.md) | Spécification complète app + proposition API serveur (OVH) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | CI/CD, VPS Metro, Expo Go |

## État actuel (août 2026)

- **App** : `0.1.0` · **Schéma SQLite** : v5
- **Backend** : non déployé — l’app est **compliance-ready** et **prête à connecter** les endpoints
- **Source de vérité** : le serveur (l’app = client offline-first + cache + file de sync)

## Commandes utiles

```bash
npm install
npm run typecheck
npm test
npx expo start
```

## Structure code (`src/`)

```
application/     bootstrap.ts, AppProviders
core/            di, http (ApiClient), sync (SyncOperation, SyncVersions), compliance
database/        schema v5, migrations 001–005
features/        auth, cart, checkout, compliance, dashboard, products, settings, sync…
navigation/      AppNavigator, drawer
shared/          audit, theme, services
```
