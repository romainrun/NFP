import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { Category } from '@/features/products/domain/types';
import { useCatalogAccess } from '@/features/products/presentation/hooks/useCatalogAccess';
import type { AppStackParamList } from '@/navigation/types';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import type { IAuditService } from '@/shared/services/audit/AuditService';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'CategoryList'>;

export function CategoryListScreen({ navigation }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { canManage, userId } = useCatalogAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0F766E');
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const result = await repo.list(true);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor('#0F766E');
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setColor(category.color ?? '#0F766E');
    setError(null);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error('Permission refusée');
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const audit = container.resolve<IAuditService>(TOKENS.AuditService);

      if (editing) {
        const result = await repo.update({
          id: editing.id,
          name,
          color,
          isActive: editing.isActive,
        });
        if (!result.ok) throw result.error;
        await audit.log({
          userId,
          action: 'category_change',
          entityType: 'category',
          entityId: editing.id,
          payload: { op: 'update', name },
        });
        return result.value;
      }

      const result = await repo.create({ name, color });
      if (!result.ok) throw result.error;
      await audit.log({
        userId,
        action: 'category_change',
        entityType: 'category',
        entityId: result.value.id,
        payload: { op: 'create', name },
      });
      return result.value;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (category: Category) => {
      if (!canManage) throw new Error('Permission refusée');
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const audit = container.resolve<IAuditService>(TOKENS.AuditService);
      const result = await repo.deactivate(category.id);
      if (!result.ok) throw result.error;
      await audit.log({
        userId,
        action: 'category_change',
        entityType: 'category',
        entityId: category.id,
        payload: { op: 'deactivate', name: category.name },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: Error) => Alert.alert('Erreur', err.message),
  });

  if (categoriesQuery.isLoading && !categoriesQuery.data) {
    return <LoadingOverlay label="Chargement des catégories…" />;
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.h2, { color: theme.colors.onSurface }]}>Catégories</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Organisation du catalogue
          </Text>
        </View>
        {canManage ? (
          <Button mode="contained" onPress={openCreate}>
            Ajouter
          </Button>
        ) : null}
      </View>

      <FlatList
        data={categoriesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={categoriesQuery.isRefetching}
        onRefresh={() => void categoriesQuery.refetch()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                opacity: item.isActive ? 1 : 0.55,
              },
            ]}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: item.color ?? theme.colors.primary },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                {item.name}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                Ordre {item.sortOrder}
                {!item.isActive ? ' · Inactive' : ''}
              </Text>
            </View>
            {canManage ? (
              <View style={styles.rowActions}>
                <Button compact onPress={() => openEdit(item)}>
                  Modifier
                </Button>
                {item.isActive ? (
                  <Button
                    compact
                    textColor={theme.colors.error}
                    onPress={() =>
                      Alert.alert(
                        'Désactiver',
                        `Désactiver « ${item.name} » ?`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Désactiver',
                            style: 'destructive',
                            onPress: () => deactivateMutation.mutate(item),
                          },
                        ],
                      )
                    }
                  >
                    Désactiver
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      />

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>
            {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <TextInput
              label="Nom"
              value={name}
              onChangeText={setName}
              mode="outlined"
            />
            <TextInput
              label="Couleur (#hex)"
              value={color}
              onChangeText={setColor}
              autoCapitalize="characters"
              mode="outlined"
            />
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              loading={saveMutation.isPending}
              onPress={() => {
                setError(null);
                saveMutation.mutate();
              }}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});
