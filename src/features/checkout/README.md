# Checkout

Completes a sale from the active cart:

- cash / card tender (local provider, TPE-ready port)
- immutable `orders` + `order_lines` + `payments`
- stock decrement + inventory movements
- receipt hash chain (`previous_hash` → `receipt_hash`)
