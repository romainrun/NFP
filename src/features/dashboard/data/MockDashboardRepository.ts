import { ok, type Result } from '@/core/types/Result';
import type { IDashboardRepository } from '@/features/dashboard/data/DashboardRepository';
import type { DashboardSnapshot } from '@/features/dashboard/domain/types';

/**
 * Mock dashboard metrics until sales/orders repositories exist.
 * UI depends only on IDashboardRepository — swap to SQLite later.
 */
export class MockDashboardRepository implements IDashboardRepository {
  async getSnapshot(): Promise<Result<DashboardSnapshot>> {
    const snapshot: DashboardSnapshot = {
      generatedAt: new Date().toISOString(),
      metrics: [
        {
          id: 'revenue_today',
          label: "CA aujourd'hui",
          value: '1 248,50 €',
          deltaLabel: '+12% vs hier',
          tone: 'positive',
        },
        {
          id: 'revenue_week',
          label: 'CA semaine',
          value: '8 420,00 €',
          deltaLabel: '+4%',
          tone: 'positive',
        },
        {
          id: 'avg_basket',
          label: 'Panier moyen',
          value: '32,40 €',
          deltaLabel: 'stable',
          tone: 'neutral',
        },
        {
          id: 'refunds',
          label: 'Remboursements',
          value: '64,00 €',
          deltaLabel: '2 tickets',
          tone: 'warning',
        },
      ],
      topProducts: [
        {
          id: 'p1',
          name: "Huile d'argan 50ml",
          quantitySold: 18,
          revenueLabel: '540,00 €',
        },
        {
          id: 'p2',
          name: 'Savon karité',
          quantitySold: 42,
          revenueLabel: '336,00 €',
        },
        {
          id: 'p3',
          name: 'Crème visage',
          quantitySold: 11,
          revenueLabel: '275,00 €',
        },
      ],
      salesPerHour: [
        { hourLabel: '09h', amountCents: 8200 },
        { hourLabel: '10h', amountCents: 15400 },
        { hourLabel: '11h', amountCents: 22100 },
        { hourLabel: '12h', amountCents: 19800 },
        { hourLabel: '13h', amountCents: 11200 },
        { hourLabel: '14h', amountCents: 16700 },
        { hourLabel: '15h', amountCents: 24300 },
        { hourLabel: '16h', amountCents: 28100 },
      ],
      inventoryAlerts: [
        'Savon karité — stock bas (3)',
        'Brume corps — rupture',
      ],
    };

    return ok(snapshot);
  }
}
