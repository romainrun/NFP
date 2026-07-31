import * as Crypto from 'expo-crypto';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
} from '@/features/payments/domain/PaymentProvider';

/**
 * Offline / local tender capture for cash + simulated card.
 * Replace with Stripe Terminal / Worldline adapter later via DI.
 */
export class LocalPaymentProvider implements PaymentProvider {
  readonly id = 'local';

  async startPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (request.amountCents <= 0) {
      return {
        success: false,
        provider: this.id,
        message: 'Montant invalide',
      };
    }

    if (request.method === 'cash') {
      return {
        success: true,
        provider: this.id,
        providerReference: `CASH-${request.reference}`,
        message: 'Espèces acceptées',
      };
    }

    if (request.method === 'card') {
      // Simulated card capture — always succeeds in offline mode.
      await new Promise((resolve) => setTimeout(resolve, 350));
      return {
        success: true,
        provider: this.id,
        providerReference: `CARD-${Crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        message: 'Carte acceptée (simulation)',
      };
    }

    return {
      success: false,
      provider: this.id,
      message: `Moyen de paiement non supporté: ${request.method}`,
    };
  }
}
