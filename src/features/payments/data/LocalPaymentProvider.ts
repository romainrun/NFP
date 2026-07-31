import * as Crypto from 'expo-crypto';
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
} from '@/features/payments/domain/PaymentProvider';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/domain/paymentMethods';

/**
 * Offline / local tender capture.
 * Cash is immediate; other methods are simulated success (ready for real TPE / PSP).
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

    if (request.method === 'gift_card' || request.method === 'store_credit' || request.method === 'split') {
      return {
        success: false,
        provider: this.id,
        message: `Moyen de paiement non supporté: ${PAYMENT_METHOD_LABELS[request.method]}`,
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

    await new Promise((resolve) => setTimeout(resolve, 280));
    const prefix = request.method.toUpperCase().slice(0, 6);
    return {
      success: true,
      provider: this.id,
      providerReference: `${prefix}-${Crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      message: `${PAYMENT_METHOD_LABELS[request.method]} accepté (simulation)`,
    };
  }
}
