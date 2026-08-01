# NFP — Naturally Forme Paiement

Application caisse **offline-first** pour magasin physique (tablettes Android + iPhone).  
Stack : **Expo SDK 54 · React Native · TypeScript strict**.

Le **backend** est la source de vérité métier ; l’app mobile est un client avec cache SQLite, file de synchronisation et préparation conformité POS française.

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/README.md](docs/README.md) | Index de toute la documentation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture Local/Remote, sync, DI |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Inaltérabilité, hash chain, audit, snapshots |
| [docs/CHANGELOG_RECENT.md](docs/CHANGELOG_RECENT.md) | Synthèse des refactors récents |
| [docs/NFP_APP_AND_SERVER_SPEC.md](docs/NFP_APP_AND_SERVER_SPEC.md) | Spec complète app + API serveur (OVH) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | CI/CD VPS Metro, Expo Go |

**État actuel :** app `0.1.0` · schéma SQLite **v5** · backend non déployé (app **compliance-ready**).

## Expo Go

Cible **Expo SDK 54** pour Expo Go (aligné avec les autres projets Metro sur le VPS).

Si vous voyez *Project is incompatible with this version of Expo Go*, le téléphone et le serveur Metro ne sont pas sur le même SDK.

## CI/CD développement (VPS Metro)

Chaque push sur `main` déploie sur le VPS Expo Metro (PM2 `nfp-metro`, port **2000**).

Guide complet : [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

```text
git push origin main  →  GitHub Actions  →  SSH  →  deploy.sh  →  PM2 restart
```

Secrets Actions : `HOST`, `PORT`, `USERNAME`, `SSH_KEY`.

URL Metro (Expo Go) :

```text
exp://tikilote.re:2000
```

## Lancer en local

```bash
npm install
npx expo start
```

## PIN démo (seed offline)

Tous les employés seed utilisent le PIN **`0000`**. L’écran de connexion propose aussi **Passer** (dev).

| Code   | Nom      | Rôle    | PIN  |
|--------|----------|---------|------|
| MANU   | Manuella | admin   | 0000 |
| ROMAIN | Romain   | admin   | 0000 |
| MEDDY  | Meddy    | manager | 0000 |

Changer ces PIN et désactiver `allowPinSkip` avant toute production.

## Fonctionnalités principales

- **Caisse (POS)** : catalogue, scan, panier, remises, promos, encaissement cash/carte/mixte
- **Ventes** : tickets immuables, hash chain, historique, annulation (void)
- **Catalogue** : articles, catégories, photos locales, import/export CSV
- **Inventaire** : mouvements append-only, alertes stock
- **Clôture de caisse** : comptage, écart, breakdown paiements
- **Exports** : CSV ventes et catalogue (partage natif)
- **Paramètres admin** : hub complet (magasin, POS, taxes, tickets, stock, promos, employés, appareils, sync, développeur)
- **Serveur & sauvegardes** : statut backend, sauvegarde serveur (`POST /backup`) — pas de dump SQLite local
- **Sync** : `SyncCoordinator` (push file + pull versionné), `ApiClient` prêt
- **Conformité** : triggers inaltérabilité, snapshots, audit enrichi, diagnostics dev

## Navigation (menu latéral)

Tableau de bord · Caisse · Historique · Clôture · Exports · Articles · Catégories · Inventaire · Promotions · Membres · Paramètres

## Scripts

| Commande | Usage |
|----------|-------|
| `npm start` | Serveur Expo |
| `npm run android` / `ios` / `web` | Plateformes |
| `npm test` | Tests unitaires |
| `npm run typecheck` | TypeScript strict |

## Structure

```
src/
  application/   # bootstrap.ts, AppProviders
  core/          # DI, ApiClient, sync, compliance
  database/      # Schéma v5, migrations 001–005
  features/      # Modules métier (feature-first)
  navigation/    # Auth + drawer
  shared/        # UI, thème, audit
docs/            # Documentation projet
```

## Sécurité (fondations)

- PIN : salt + SHA-256 (migration serveur → Argon2 recommandée)
- Session : Secure Store (JWT-ready)
- `audit_logs` append-only
- Tables comptables : immuables (repositories + triggers SQLite v5)
- Déconnexion auto après inactivité (15 min)
