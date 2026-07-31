import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { chainHash } from '@/core/security/hash';
import { err, ok, type Result } from '@/core/types/Result';
import { withWriteTransaction } from '@/database/transaction';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import type {
  HourlySalesBucket,
  OrderSummary,
  PaymentBreakdown,
  SalesHistoryQuery,
  SalesHistorySnapshot,
} from '@/features/checkout/domain/salesHistory';
import type {
  CompleteSaleInput,
  CompleteSaleResult,
  Order,
  OrderLine,
  OrderPayment,
} from '@/features/checkout/domain/types';
import type { PaymentProvider } from '@/features/payments/domain/PaymentProvider';
import type { ISyncRepository } from '@/features/sync/data/SyncRepository';
import type { IAuditService } from '@/shared/services/audit/AuditService';
import { vatFromTtc } from '@/shared/utils/pricing';

type OrderRow = {
  id: string;
  receipt_number: number;
  user_id: string;
  customer_id: string | null;
  status: 'completed' | 'voided';
  subtotal_cents: number;
  discount_cents: number;
  vat_cents: number;
  total_cents: number;
  notes: string | null;
  previous_hash: string | null;
  receipt_hash: string;
  created_at: string;
  device_id: string;
  app_version: string;
};

type OrderLineRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  vat_rate: number;
  vat_cents: number;
  line_total_cents: number;
};

type PaymentRow = {
  id: string;
  order_id: string;
  method: OrderPayment['method'];
  amount_cents: number;
  provider: string | null;
  provider_reference: string | null;
  status: OrderPayment['status'];
  created_at: string;
};

function deviceId(): string {
  return `${Platform.OS}-${Constants.sessionId ?? 'device'}`;
}

function mapOrder(
  row: OrderRow,
  lines: OrderLine[],
  payments: OrderPayment[],
): Order {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    userId: row.user_id,
    customerId: row.customer_id,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    vatCents: row.vat_cents,
    totalCents: row.total_cents,
    notes: row.notes,
    previousHash: row.previous_hash,
    receiptHash: row.receipt_hash,
    createdAt: row.created_at,
    deviceId: row.device_id,
    appVersion: row.app_version,
    lines,
    payments,
  };
}

export class SqliteOrderRepository implements IOrderRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly carts: ICartRepository,
    private readonly payments: PaymentProvider,
    private readonly audit: IAuditService,
    private readonly sync?: ISyncRepository,
  ) {}

  async getById(orderId: string): Promise<Result<Order>> {
    try {
      const row = await this.db.getFirstAsync<OrderRow>(
        `SELECT * FROM orders WHERE id = ?`,
        orderId,
      );
      if (!row) return err(AppError.notFound('Ticket introuvable'));

      const lineRows = await this.db.getAllAsync<OrderLineRow>(
        `SELECT * FROM order_lines WHERE order_id = ?`,
        orderId,
      );
      const paymentRows = await this.db.getAllAsync<PaymentRow>(
        `SELECT * FROM payments WHERE order_id = ?`,
        orderId,
      );

      return ok(
        mapOrder(
          row,
          lineRows.map((l) => ({
            id: l.id,
            orderId: l.order_id,
            productId: l.product_id,
            productName: l.product_name,
            quantity: l.quantity,
            unitPriceCents: l.unit_price_cents,
            discountCents: l.discount_cents,
            vatRate: l.vat_rate,
            vatCents: l.vat_cents,
            lineTotalCents: l.line_total_cents,
          })),
          paymentRows.map((p) => ({
            id: p.id,
            orderId: p.order_id,
            method: p.method,
            amountCents: p.amount_cents,
            provider: p.provider,
            providerReference: p.provider_reference,
            status: p.status,
            createdAt: p.created_at,
          })),
        ),
      );
    } catch (cause) {
      return err(AppError.database('Impossible de charger le ticket', cause));
    }
  }

  async completeSale(input: CompleteSaleInput): Promise<Result<CompleteSaleResult>> {
    const cartResult = await this.carts.getById(input.cartId);
    if (!cartResult.ok) return err(cartResult.error);

    const cart = cartResult.value;
    if (cart.userId !== input.userId) {
      return err(AppError.forbidden('Ce panier appartient à un autre utilisateur'));
    }
    if (cart.lines.length === 0) {
      return err(AppError.validation('Le panier est vide'));
    }
    if (cart.totalCents <= 0) {
      return err(AppError.validation('Le total doit être positif'));
    }
    if (!input.payments.length) {
      return err(AppError.validation('Aucun paiement fourni'));
    }

    const paidCents = input.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const tenderedCents = input.payments.reduce(
      (sum, p) => sum + (p.tenderedCents ?? p.amountCents),
      0,
    );

    if (paidCents < cart.totalCents) {
      return err(AppError.validation('Paiement insuffisant'));
    }

    const changeCents = Math.max(0, tenderedCents - cart.totalCents);

    // Capture tenders before writing the immutable order.
    for (const payment of input.payments) {
      const capture = await this.payments.startPayment({
        amountCents: payment.amountCents,
        currency: 'EUR',
        method: payment.method,
        orderId: 'pending',
        reference: cart.id,
      });
      if (!capture.success) {
        return err(
          AppError.validation(capture.message ?? 'Échec du paiement'),
        );
      }
    }

    const orderId = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    try {
      await withWriteTransaction(this.db, async (txn) => {
        const last = await txn.getFirstAsync<{
          receipt_number: number;
          receipt_hash: string;
        }>(
          `SELECT receipt_number, receipt_hash FROM orders
           ORDER BY receipt_number DESC LIMIT 1`,
        );

        const receiptNumber = (last?.receipt_number ?? 0) + 1;
        const previousHash = last?.receipt_hash ?? null;

        const payload = JSON.stringify({
          receiptNumber,
          totalCents: cart.totalCents,
          userId: input.userId,
          createdAt,
          lines: cart.lines.map((l) => ({
            productId: l.productId,
            qty: l.quantity,
            total: l.lineTotalCents,
          })),
        });

        const receiptHash = await chainHash(previousHash ?? 'GENESIS', payload);

        await txn.runAsync(
          `INSERT INTO orders (
            id, receipt_number, user_id, customer_id, status,
            subtotal_cents, discount_cents, vat_cents, total_cents,
            notes, previous_hash, receipt_hash, created_at, device_id, app_version
          ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          orderId,
          receiptNumber,
          input.userId,
          cart.customerId,
          cart.subtotalCents,
          cart.discountCents,
          cart.vatCents,
          cart.totalCents,
          input.notes?.trim() || null,
          previousHash,
          receiptHash,
          createdAt,
          deviceId(),
          APP_CONFIG.version,
        );

        for (const line of cart.lines) {
          const lineDiscountCents =
            Math.round(line.unitPriceCents * line.quantity) - line.lineTotalCents;
          const linePayable =
            cart.subtotalCents === 0
              ? 0
              : Math.round(
                  (line.lineTotalCents / cart.subtotalCents) * cart.totalCents,
                );
          const lineVat = vatFromTtc(linePayable, line.vatRate);

          await txn.runAsync(
            `INSERT INTO order_lines (
              id, order_id, product_id, product_name, quantity,
              unit_price_cents, discount_cents, vat_rate, vat_cents, line_total_cents
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            Crypto.randomUUID(),
            orderId,
            line.productId,
            line.productName,
            line.quantity,
            line.unitPriceCents,
            lineDiscountCents,
            line.vatRate,
            lineVat,
            line.lineTotalCents,
          );

          const product = await txn.getFirstAsync<{ stock_quantity: number }>(
            `SELECT stock_quantity FROM products WHERE id = ?`,
            line.productId,
          );
          if (product) {
            const nextStock = Math.max(0, product.stock_quantity - line.quantity);
            await txn.runAsync(
              `UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?`,
              nextStock,
              createdAt,
              line.productId,
            );
            await txn.runAsync(
              `INSERT INTO inventory_movements (
                id, product_id, user_id, type, quantity, reason, created_at
              ) VALUES (?, ?, ?, 'sale', ?, ?, ?)`,
              Crypto.randomUUID(),
              line.productId,
              input.userId,
              -line.quantity,
              `Vente ticket #${receiptNumber}`,
              createdAt,
            );
          }
        }

        let remaining = cart.totalCents;
        for (const payment of input.payments) {
          const applied = Math.min(remaining, payment.amountCents);
          remaining -= applied;
          await txn.runAsync(
            `INSERT INTO payments (
              id, order_id, method, amount_cents, provider, provider_reference,
              status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'captured', ?)`,
            Crypto.randomUUID(),
            orderId,
            payment.method,
            applied,
            this.payments.id,
            `${payment.method.toUpperCase()}-${receiptNumber}`,
            createdAt,
          );
        }

        await txn.runAsync(`DELETE FROM cart_lines WHERE cart_id = ?`, cart.id);
        await txn.runAsync(
          `UPDATE cart SET global_discount_bps = 0, notes = NULL, updated_at = ? WHERE id = ?`,
          createdAt,
          cart.id,
        );
      });

      const order = await this.getById(orderId);
      if (!order.ok) return err(order.error);

      await this.audit.log({
        userId: input.userId,
        action: 'sale',
        entityType: 'order',
        entityId: orderId,
        payload: {
          receiptNumber: order.value.receiptNumber,
          totalCents: order.value.totalCents,
          changeCents,
          methods: input.payments.map((p) => p.method),
        },
      });

      if (this.sync) {
        await this.sync.enqueue({
          entityType: 'order',
          entityId: orderId,
          operation: 'create',
          payload: {
            orderId,
            receiptNumber: order.value.receiptNumber,
            totalCents: order.value.totalCents,
            createdAt: order.value.createdAt,
          },
        });
      }

      return ok({ order: order.value, changeCents });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(AppError.database('Impossible de finaliser la vente', cause));
    }
  }

  async voidOrder(
    orderId: string,
    userId: string,
    reason = 'Annulation ticket',
  ): Promise<Result<Order>> {
    const current = await this.getById(orderId);
    if (!current.ok) return current;
    if (current.value.status === 'voided') {
      return err(AppError.validation('Ce ticket est déjà annulé'));
    }

    const now = new Date().toISOString();

    try {
      await withWriteTransaction(this.db, async (txn) => {
        await txn.runAsync(
          `UPDATE orders SET status = 'voided' WHERE id = ?`,
          orderId,
        );

        for (const line of current.value.lines) {
          if (!line.productId) continue;
          await txn.runAsync(
            `UPDATE products
             SET stock_quantity = stock_quantity + ?, updated_at = ?
             WHERE id = ?`,
            line.quantity,
            now,
            line.productId,
          );
          await txn.runAsync(
            `INSERT INTO inventory_movements (
              id, product_id, user_id, type, quantity, reason, created_at
            ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?)`,
            Crypto.randomUUID(),
            line.productId,
            userId,
            line.quantity,
            `Annulation ticket #${current.value.receiptNumber}`,
            now,
          );
        }
      });

      await this.audit.log({
        userId,
        action: 'void',
        entityType: 'order',
        entityId: orderId,
        payload: {
          receiptNumber: current.value.receiptNumber,
          totalCents: current.value.totalCents,
          reason,
        },
      });

      const updated = await this.getById(orderId);
      if (!updated.ok) return updated;
      return ok(updated.value);
    } catch (cause) {
      return err(AppError.database('Impossible d’annuler le ticket', cause));
    }
  }

  async getSalesHistory(
    query: SalesHistoryQuery,
  ): Promise<Result<SalesHistorySnapshot>> {
    try {
      const rows = await this.db.getAllAsync<{
        id: string;
        receipt_number: number;
        created_at: string;
        total_cents: number;
        vat_cents: number;
        discount_cents: number;
        status: 'completed' | 'voided';
        item_count: number | null;
        payment_methods: string | null;
      }>(
        `SELECT
           o.id,
           o.receipt_number,
           o.created_at,
           o.total_cents,
           o.vat_cents,
           o.discount_cents,
           o.status,
           (SELECT COALESCE(SUM(ol.quantity), 0) FROM order_lines ol WHERE ol.order_id = o.id) AS item_count,
           (SELECT GROUP_CONCAT(DISTINCT p.method) FROM payments p WHERE p.order_id = o.id) AS payment_methods
         FROM orders o
         WHERE o.status = 'completed'
           AND o.created_at >= ?
           AND o.created_at < ?
         ORDER BY o.created_at DESC`,
        query.fromIso,
        query.toIso,
      );

      const orders: OrderSummary[] = rows.map((row) => ({
        id: row.id,
        receiptNumber: row.receipt_number,
        createdAt: row.created_at,
        totalCents: row.total_cents,
        vatCents: row.vat_cents,
        discountCents: row.discount_cents,
        status: row.status,
        itemCount: row.item_count ?? 0,
        paymentMethods: row.payment_methods
          ? row.payment_methods.split(',').filter(Boolean)
          : [],
      }));

      const hourlyMap = new Map<number, HourlySalesBucket>();
      for (let hour = 0; hour < 24; hour += 1) {
        hourlyMap.set(hour, { hour, orderCount: 0, totalCents: 0 });
      }

      let totalCents = 0;
      let vatCents = 0;
      let discountCents = 0;

      for (const order of orders) {
        totalCents += order.totalCents;
        vatCents += order.vatCents;
        discountCents += order.discountCents;
        const hour = new Date(order.createdAt).getHours();
        const bucket = hourlyMap.get(hour);
        if (bucket) {
          bucket.orderCount += 1;
          bucket.totalCents += order.totalCents;
        }
      }

      const paymentRows = await this.db.getAllAsync<{
        method: string;
        total_cents: number;
        order_count: number;
      }>(
        `SELECT
           p.method,
           COALESCE(SUM(p.amount_cents), 0) AS total_cents,
           COUNT(DISTINCT p.order_id) AS order_count
         FROM payments p
         INNER JOIN orders o ON o.id = p.order_id
         WHERE o.status = 'completed'
           AND o.created_at >= ?
           AND o.created_at < ?
         GROUP BY p.method
         ORDER BY total_cents DESC`,
        query.fromIso,
        query.toIso,
      );

      const paymentBreakdown: PaymentBreakdown[] = paymentRows.map((row) => ({
        method: row.method,
        totalCents: row.total_cents,
        orderCount: row.order_count,
      }));

      const orderCount = orders.length;
      return ok({
        fromIso: query.fromIso,
        toIso: query.toIso,
        orderCount,
        totalCents,
        vatCents,
        discountCents,
        averageTicketCents: orderCount ? Math.round(totalCents / orderCount) : 0,
        hourly: Array.from(hourlyMap.values()),
        paymentBreakdown,
        orders,
      });
    } catch (cause) {
      return err(AppError.database('Impossible de charger l’historique', cause));
    }
  }
}
