import type { AuditAction } from '@/shared/services/audit/AuditService';

export type ActivityHistoryItem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  createdAt: string;
  employeeName: string | null;
  /** Server-owned events vs temporary local-only entries (offline). */
  source: 'server' | 'local';
};

type ActionMeta = {
  icon: string;
  title: string;
  subtitleFromPayload?: (payload: Record<string, unknown> | null) => string;
};

const ACTION_META: Record<string, ActionMeta> = {
  sale: {
    icon: 'cart',
    title: 'Vente enregistrée',
    subtitleFromPayload: (p) =>
      p?.receiptNumber ? `Ticket #${p.receiptNumber}` : 'Vente terminée',
  },
  void: {
    icon: 'cart-remove',
    title: 'Vente annulée',
    subtitleFromPayload: (p) =>
      p?.receiptNumber ? `Ticket #${p.receiptNumber}` : 'Annulation',
  },
  product_create: {
    icon: 'package-variant-plus',
    title: 'Produit ajouté',
    subtitleFromPayload: (p) => String(p?.name ?? p?.sku ?? ''),
  },
  product_update: {
    icon: 'package-variant',
    title: 'Produit modifié',
    subtitleFromPayload: (p) => String(p?.name ?? p?.sku ?? ''),
  },
  product_deactivate: {
    icon: 'package-variant-closed',
    title: 'Produit désactivé',
    subtitleFromPayload: (p) => String(p?.name ?? ''),
  },
  inventory_change: {
    icon: 'clipboard-list-outline',
    title: 'Stock mis à jour',
    subtitleFromPayload: (p) => {
      const qty = p?.quantity;
      const name = p?.name ?? p?.productName;
      if (name && qty) return `${name} (${qty})`;
      return String(name ?? 'Mouvement de stock');
    },
  },
  config_change: {
    icon: 'cog-outline',
    title: 'Paramètres modifiés',
    subtitleFromPayload: (p) => String(p?.section ?? 'Administration'),
  },
  sync_started: {
    icon: 'cloud-sync-outline',
    title: 'Synchronisation démarrée',
    subtitleFromPayload: () => 'Sync en cours',
  },
  sync_finished: {
    icon: 'cloud-check-outline',
    title: 'Synchronisation terminée',
    subtitleFromPayload: (p) => String(p?.message ?? 'OK'),
  },
  sync_failed: {
    icon: 'cloud-alert-outline',
    title: 'Synchronisation échouée',
    subtitleFromPayload: (p) => String(p?.reason ?? p?.message ?? 'Échec'),
  },
  cash_closing: {
    icon: 'cash-register',
    title: 'Clôture de caisse',
    subtitleFromPayload: (p) =>
      p?.totalCents != null ? `${(p.totalCents as number) / 100} €` : 'Clôture enregistrée',
  },
  user_change: {
    icon: 'account-edit-outline',
    title: 'Employé modifié',
    subtitleFromPayload: (p) => String(p?.displayName ?? p?.employeeCode ?? ''),
  },
  login: {
    icon: 'login',
    title: 'Connexion',
    subtitleFromPayload: () => 'Session ouverte',
  },
  discount: {
    icon: 'tag-percent-outline',
    title: 'Remise appliquée',
    subtitleFromPayload: (p) => String(p?.label ?? ''),
  },
};

export function mapAuditToActivity(
  action: string,
  payloadJson: string | null,
  employeeName: string | null,
  entityId: string | null,
): Pick<ActivityHistoryItem, 'icon' | 'title' | 'subtitle'> {
  let payload: Record<string, unknown> | null = null;
  if (payloadJson) {
    try {
      payload = JSON.parse(payloadJson) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }

  const meta = ACTION_META[action];
  if (meta) {
    return {
      icon: meta.icon,
      title: meta.title,
      subtitle: meta.subtitleFromPayload?.(payload) ?? employeeName ?? '',
    };
  }

  return {
    icon: 'information-outline',
    title: action,
    subtitle: employeeName ?? entityId ?? '',
  };
}

export const VISIBLE_ACTIVITY_ACTIONS: AuditAction[] = [
  'sale',
  'void',
  'product_create',
  'product_update',
  'product_deactivate',
  'inventory_change',
  'config_change',
  'sync',
  'sync_started',
  'sync_finished',
  'sync_failed',
  'cash_closing',
  'user_change',
  'discount',
];
