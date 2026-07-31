# Products / Catalog

Full offline catalog management for the NFP POS:

- Categories (create / update / soft-deactivate)
- Articles (create / update / soft-deactivate)
- Search by name, SKU, barcode
- Filters: category, favorites, quick products, inactive
- Price (cents), French VAT rates, cost, stock
- Stock adjustments with `inventory_movements` ledger + audit trail

Access is gated by the `inventory.manage` permission (admin + manager).
