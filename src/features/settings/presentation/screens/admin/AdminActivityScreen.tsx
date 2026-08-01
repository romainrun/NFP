import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IActivityHistoryRepository } from '@/features/settings/data/ActivityHistoryRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const PAGE_SIZE = 25;

function formatWhen(dateIso: string): string {
  const date = new Date(dateIso);
  const time = format(date, 'HH:mm', { locale: fr });
  if (isToday(date)) return `Aujourd’hui · ${time}`;
  if (isYesterday(date)) return `Hier · ${time}`;
  return format(date, 'dd/MM/yy · HH:mm', { locale: fr });
}

export function AdminActivityScreen() {
  const theme = useTheme();
  const [page, setPage] = useState(0);

  const activityQuery = useQuery({
    queryKey: ['activity-history', page],
    queryFn: async () => {
      const repo = container.resolve<IActivityHistoryRepository>(TOKENS.ActivityHistoryRepository);
      const result = await repo.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const countQuery = useQuery({
    queryKey: ['activity-history', 'count'],
    queryFn: async () => {
      const repo = container.resolve<IActivityHistoryRepository>(TOKENS.ActivityHistoryRepository);
      const result = await repo.count();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const total = countQuery.data ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < total;

  return (
    <AdminScreenShell title="Historique" subtitle="Activité du magasin — serveur source de vérité">
      {activityQuery.isLoading && !activityQuery.data ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={activityQuery.data ?? []}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (hasMore && !activityQuery.isFetching) setPage((p) => p + 1);
          }}
          renderItem={({ item }) => (
            <View style={[styles.row, shadows.sm]}>
              <Icon source={item.icon} size={22} color={theme.colors.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.bodyStrong, { color: Colors.text }]}>{item.title}</Text>
                <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
                <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                  {formatWhen(item.createdAt)}
                  {item.employeeName ? ` · ${item.employeeName}` : ''}
                  {item.source === 'local' ? ' · local (en attente)' : ''}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[typography.caption, { color: Colors.textSecondary }]}>
              Aucune activité enregistrée pour le moment.
            </Text>
          }
          ListFooterComponent={
            activityQuery.isFetching && page > 0 ? <ActivityIndicator style={{ marginTop: spacing.sm }} /> : null
          }
        />
      )}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
  },
});
