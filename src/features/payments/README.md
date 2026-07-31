# Payments

`PaymentProvider` port + `LocalPaymentProvider` (cash + simulated card).

Swap the DI registration for a real terminal adapter (Stripe Terminal, Worldline, …)
without changing checkout UI.
