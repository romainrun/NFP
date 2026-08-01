import type { Order } from '@/features/checkout/domain/types';
import type { ReceiptSettings } from '@/features/settings/domain/adminSettings';
import type { ShopInfo } from '@/features/settings/domain/types';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import { formatMoney } from '@/shared/utils/money';

export type ReceiptTextInput = {
  order: Order;
  storeName: string;
  shopInfo: ShopInfo;
  receipt: ReceiptSettings;
};

/**
 * Builds shareable receipt text respecting admin receipt toggles.
 */
export function buildReceiptText(input: ReceiptTextInput): string[] {
  const { order, storeName, shopInfo, receipt } = input;
  const lines: string[] = [];

  if (receipt.showLogoOnReceipt && receipt.logoUri) {
    lines.push('— Naturally Forme —');
  }

  lines.push(receipt.headerText || storeName || 'Naturally Forme');

  if (shopInfo.address) lines.push(shopInfo.address);
  if (shopInfo.phone) lines.push(`Tél. ${shopInfo.phone}`);
  if (shopInfo.siret) lines.push(`SIRET ${shopInfo.siret}`);

  lines.push('');
  lines.push(`Ticket #${order.receiptNumber}`);
  lines.push(new Date(order.createdAt).toLocaleString('fr-FR'));

  for (const line of order.lines) {
    lines.push(`${line.quantity} x ${line.productName} — ${formatMoney(line.lineTotalCents)}`);
  }

  lines.push('');
  lines.push(`Total TTC: ${formatMoney(order.totalCents)}`);
  lines.push(`TVA: ${formatMoney(order.vatCents)}`);

  for (const payment of order.payments) {
    lines.push(`${paymentMethodLabel(payment.method)}: ${formatMoney(payment.amountCents)}`);
  }

  if (receipt.footerText) {
    lines.push('');
    lines.push(receipt.footerText);
  }

  if (receipt.qrCodeEnabled && order.receiptHash) {
    lines.push('');
    lines.push(`QR: ${order.receiptHash}`);
  }

  return lines.filter((line) => line !== undefined);
}
