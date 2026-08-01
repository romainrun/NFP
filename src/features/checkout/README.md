# Checkout & ventes

Finalisation de vente depuis le panier actif et historique des tickets.

## Vente (`SqliteOrderRepository`)

1. Validation panier (non vide, total > 0, Σ paiements ≥ TTC)
2. `PaymentProvider.startPayment` pour chaque ligne (simulation locale)
3. Transaction SQLite :
   - `orders` + `order_lines` + `payments` (immuable)
   - Décrément stock + `inventory_movements` type `sale`
   - Chaîne de hash ticket (`previous_hash` → `receipt_hash`)
   - Snapshot conformité (`compliance_snapshots`)
   - Vide le panier
4. Audit `sale` + enqueue `SALE_CREATE` (enveloppe sync avec `deviceId`, `payloadHash`)

## Annulation (`voidOrder`)

- Permission `sales.void`
- `status` → `voided` (seul champ modifiable sur `orders`)
- Restauration stock
- Audit `void` + enqueue `SALE_CANCEL`

## Historique des ventes

Écran `SalesHistory` : filtres Aujourd’hui / Hier / plage de dates, agrégats, graphique horaire, recherche n° ticket, dialog détail.

## Clôture de caisse

`SqliteCashClosingRepository` : période, fond de caisse, comptage, écart, breakdown paiements → `cash_closings` + snapshot + enqueue `CASH_CLOSING_CREATE`.

## Conformité

- Payload hash déterministe : `src/core/compliance/receiptHash.ts`
- Validation locale : `ComplianceValidationService`
- Triggers SQLite v5 : pas de DELETE sur orders/lines/payments ; UPDATE monétaire interdit

Doc : [docs/COMPLIANCE.md](../../../docs/COMPLIANCE.md)

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `data/SqliteOrderRepository.ts` | Vente, void, hash, sync enqueue |
| `data/SqliteCashClosingRepository.ts` | Clôtures |
| `presentation/screens/CheckoutScreen.tsx` | UI encaissement |
| `presentation/screens/SalesHistoryScreen.tsx` | Historique |
