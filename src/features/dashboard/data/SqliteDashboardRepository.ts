import type { SQLiteDatabase } from 'expo-sqlite';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { IDashboardRepository } from '@/features/dashboard/data/DashboardRepository';
import { INTERNAL_LOW_STOCK_THRESHOLD } from '@/features/settings/domain/adminSettings';
import type { DashboardSnapshot } from '@/features/dashboard/domain/types';
import { formatMoney } from '@/shared/utils/money';
import {
  buildDayPeriod,
  formatHourLabel,
  presetDay,
} from '@/shared/utils/salesPeriod';

function percentDelta(today: number, yesterday: number): {
  deltaLabel: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
} {
  if (yesterday <= 0 && today <= 0) {
    return { deltaLabel: '—', tone: 'neutral' };
  }
  if (yesterday <= 0) {
    return { deltaLabel: 'nouveau', tone: 'positive' };
  }
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return { deltaLabel: `+${pct}% vs hier`, tone: 'positive' };
  if (pct < 0) return { deltaLabel: `${pct}% vs hier`, tone: 'warning' };
  return { deltaLabel: 'stable vs hier', tone: 'neutral' };
}

/**
 * Live dashboard metrics from completed orders + stock.
 */
export class SqliteDashboardRepository implements IDashboardRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getSnapshot(): Promise<Result<DashboardSnapshot>> {
    try {
      const today = buildDayPeriod(presetDay('today'));
      const yesterday = buildDayPeriod(presetDay('yesterday'));

      const weekStart = new Date();
      const day = weekStart.getDay(); // 0 Sun … 6 Sat
      const mondayOffset = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      const weekFromIso = buildDayPeriod(weekStart).fromIso;

      const todayAgg = await this.aggregate(today.fromIso, today.toIso);
      const yesterdayAgg = await this.aggregate(yesterday.fromIso, yesterday.toIso);
      const weekAgg = await this.aggregate(weekFromIso, today.toIso);
      const delta = percentDelta(todayAgg.totalCents, yesterdayAgg.totalCents);

      const salesPerHour = await this.hourly(today.fromIso, today.toIso);
      const topProducts = await this.topProducts(today.fromIso, today.toIso, 5);
      const inventoryAlerts = await this.stockAlerts();

      const snapshot: DashboardSnapshot = {
        generatedAt: new Date().toISOString(),
        metrics: [
          {
            id: 'revenue_today',
            label: "CA aujourd'hui",
            value: formatMoney(todayAgg.totalCents),
            deltaLabel: `${todayAgg.orderCount} ticket${todayAgg.orderCount === 1 ? '' : 's'} · ${delta.deltaLabel}`,
            tone: delta.tone,
          },
          {
            id: 'revenue_week',
            label: 'CA semaine',
            value: formatMoney(weekAgg.totalCents),
            deltaLabel: `${weekAgg.orderCount} tickets`,
            tone: 'neutral',
          },
          {
            id: 'avg_basket',
            label: 'Panier moyen',
            value: formatMoney(todayAgg.averageTicketCents),
            deltaLabel: "aujourd'hui",
            tone: 'neutral',
          },
          {
            id: 'tickets_today',
            label: 'Tickets du jour',
            value: String(todayAgg.orderCount),
            deltaLabel: formatMoney(todayAgg.vatCents) + ' TVA',
            tone: 'neutral',
          },
        ],
        topProducts,
        salesPerHour,
        inventoryAlerts,
      };

      return ok(snapshot);
    } catch (cause) {
      return err(AppError.database('Impossible de charger le tableau de bord', cause));
    }
  }

  private async aggregate(fromIso: string, toIso: string) {
    const row = await this.db.getFirstAsync<{
      order_count: number;
      total_cents: number | null;
      vat_cents: number | null;
    }>(
      `SELECT
         COUNT(*) as order_count,
         COALESCE(SUM(total_cents), 0) as total_cents,
         COALESCE(SUM(vat_cents), 0) as vat_cents
       FROM orders
       WHERE status = 'completed'
         AND created_at >= ?
         AND created_at < ?`,
      fromIso,
      toIso,
    );

    const orderCount = row?.order_count ?? 0;
    const totalCents = row?.total_cents ?? 0;
    const vatCents = row?.vat_cents ?? 0;

    return {
      orderCount,
      totalCents,
      vatCents,
      averageTicketCents: orderCount ? Math.round(totalCents / orderCount) : 0,
    };
  }

  private async hourly(fromIso: string, toIso: string) {
    const rows = await this.db.getAllAsync<{
      hour: number;
      total_cents: number;
    }>(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
              COALESCE(SUM(total_cents), 0) as total_cents
       FROM orders
       WHERE status = 'completed'
         AND created_at >= ?
         AND created_at < ?
       GROUP BY hour
       ORDER BY hour ASC`,
      fromIso,
      toIso,
    );

    const byHour = new Map(rows.map((r) => [r.hour, r.total_cents]));
    return Array.from({ length: 24 }, (_, hour) => ({
      hourLabel: formatHourLabel(hour),
      amountCents: byHour.get(hour) ?? 0,
    })).filter((point, index, all) => {
      // Keep a compact band around activity, or full business day 8–20 if empty.
      const hasAny = all.some((p) => p.amountCents > 0);
      if (!hasAny) return index >= 8 && index <= 20;
      const first = all.findIndex((p) => p.amountCents > 0);
      const last = all.length - 1 - [...all].reverse().findIndex((p) => p.amountCents > 0);
      return index >= Math.max(0, first - 1) && index <= Math.min(23, last + 1);
    });
  }

  private async topProducts(fromIso: string, toIso: string, limit: number) {
    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      quantity_sold: number;
      revenue_cents: number;
    }>(
      `SELECT
         COALESCE(ol.product_id, ol.product_name) as id,
         ol.product_name as name,
         COALESCE(SUM(ol.quantity), 0) as quantity_sold,
         COALESCE(SUM(ol.line_total_cents), 0) as revenue_cents
       FROM order_lines ol
       INNER JOIN orders o ON o.id = ol.order_id
       WHERE o.status = 'completed'
         AND o.created_at >= ?
         AND o.created_at < ?
       GROUP BY COALESCE(ol.product_id, ol.product_name), ol.product_name
       ORDER BY quantity_sold DESC, revenue_cents DESC
       LIMIT ?`,
      fromIso,
      toIso,
      limit,
    );

    return rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      quantitySold: row.quantity_sold,
      revenueLabel: formatMoney(row.revenue_cents),
    }));
  }

  private async stockAlerts(): Promise<string[]> {
    const rows = await this.db.getAllAsync<{
      name: string;
      stock_quantity: number;
    }>(
      `SELECT name, stock_quantity FROM products
       WHERE is_active = 1 AND stock_quantity <= ?
       ORDER BY stock_quantity ASC, name ASC
       LIMIT 8`,
      INTERNAL_LOW_STOCK_THRESHOLD,
    );

    return rows.map((row) =>
      row.stock_quantity <= 0
        ? `${row.name} — rupture`
        : `${row.name} — stock bas (${row.stock_quantity})`,
    );
  }
}
