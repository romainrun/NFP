import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  IconButton,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IUserRepository } from '@/features/authentication/data/UserRepository';
import type { INoteRepository } from '@/features/notes/data/NoteRepository';
import type { EmployeeNote } from '@/features/notes/domain/types';
import { BrandCard } from '@/shared/components/BrandCard';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type RecipientMode = 'team' | 'person';

type Props = {
  userId: string;
};

export function EmployeeNotesPanel({ userId }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('team');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const notesQuery = useQuery({
    queryKey: ['employee-notes', userId],
    queryFn: async () => {
      const repo = container.resolve<INoteRepository>(TOKENS.NoteRepository);
      const result = await repo.listForUser(userId);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', 'notes-recipients'],
    queryFn: async () => {
      const repo = container.resolve<IUserRepository>(TOKENS.UserRepository);
      const result = await repo.listActive();
      if (!result.ok) throw result.error;
      return result.value.filter((employee) => employee.id !== userId);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const repo = container.resolve<INoteRepository>(TOKENS.NoteRepository);
      const result = await repo.create({
        authorId: userId,
        recipientId: recipientMode === 'team' ? null : recipientId,
        body,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setBody('');
      setRecipientMode('team');
      setRecipientId(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['employee-notes', userId] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const repo = container.resolve<INoteRepository>(TOKENS.NoteRepository);
      const result = await repo.deleteOwn(noteId, userId);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employee-notes', userId] });
    },
  });

  const recipientOptions = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);

  const openDialog = () => {
    setFormError(null);
    setBody('');
    setRecipientMode('team');
    setRecipientId(recipientOptions[0]?.id ?? null);
    setDialogOpen(true);
  };

  const submitNote = () => {
    if (recipientMode === 'person' && !recipientId) {
      setFormError('Choisissez un destinataire');
      return;
    }
    createMutation.mutate();
  };

  return (
    <BrandCard accent style={styles.panel}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: theme.colors.onSurface }]}>Notes d’équipe</Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            Messages entre collaborateurs sur le tableau de bord
          </Text>
        </View>
        <Button mode="contained" icon="note-plus-outline" onPress={openDialog} compact>
          Nouvelle
        </Button>
      </View>

      {notesQuery.isLoading ? (
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Chargement des notes…
        </Text>
      ) : null}

      {notesQuery.isError ? (
        <HelperText type="error" visible>
          Impossible de charger les notes
        </HelperText>
      ) : null}

      <FlatList
        data={notesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          !notesQuery.isLoading ? (
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              Aucune note pour le moment — laissez un message à l’équipe ou à un collègue.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <NoteRow
            note={item}
            currentUserId={userId}
            onDelete={() => deleteMutation.mutate(item.id)}
            deleting={deleteMutation.isPending}
          />
        )}
      />

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>Nouvelle note</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <SegmentedButtons
              value={recipientMode}
              onValueChange={(value) => setRecipientMode(value as RecipientMode)}
              buttons={[
                { value: 'team', label: 'Équipe', icon: 'account-group-outline' },
                { value: 'person', label: 'Collègue', icon: 'account-outline' },
              ]}
            />

            {recipientMode === 'person' ? (
              <View style={styles.recipientList}>
                {recipientOptions.length === 0 ? (
                  <HelperText type="info" visible>
                    Aucun autre collaborateur actif.
                  </HelperText>
                ) : (
                  recipientOptions.map((employee) => {
                    const selected = recipientId === employee.id;
                    return (
                      <Button
                        key={employee.id}
                        mode={selected ? 'contained' : 'outlined'}
                        onPress={() => setRecipientId(employee.id)}
                        style={styles.recipientBtn}
                        contentStyle={styles.recipientBtnContent}
                      >
                        {employee.displayName}
                      </Button>
                    );
                  })
                )}
              </View>
            ) : (
              <HelperText type="info" visible>
                Visible par tous les collaborateurs sur le tableau de bord.
              </HelperText>
            )}

            <TextInput
              mode="outlined"
              label="Message"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
              placeholder="Ex. rupture sur whey vanille, client à rappeler…"
            />

            {formError ? (
              <HelperText type="error" visible>{formError}</HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              loading={createMutation.isPending}
              onPress={submitNote}
              disabled={!body.trim()}
            >
              Publier
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </BrandCard>
  );
}

function NoteRow({
  note,
  currentUserId,
  onDelete,
  deleting,
}: {
  note: EmployeeNote;
  currentUserId: string;
  onDelete: () => void;
  deleting: boolean;
}) {
  const theme = useTheme();
  const isAuthor = note.authorId === currentUserId;
  const isRecipient = note.recipientId === currentUserId;
  const isTeam = note.recipientId === null;

  const routeLabel = isTeam
    ? '→ Équipe'
    : isAuthor
      ? `→ ${note.recipientName ?? 'Collègue'}`
      : isRecipient
        ? '→ Vous'
        : `→ ${note.recipientName ?? 'Collègue'}`;

  return (
    <View
      style={[
        styles.noteRow,
        shadows.sm,
        {
          backgroundColor: isRecipient ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: isRecipient ? Colors.primary : theme.colors.outline,
        },
      ]}
    >
      <View style={styles.noteHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
            {note.authorName}
            <Text style={[typography.caption, { color: theme.colors.primary }]}>
              {' '}
              {routeLabel}
            </Text>
          </Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            {formatNoteDate(note.createdAt)}
          </Text>
        </View>
        {isAuthor ? (
          <IconButton
            icon="delete-outline"
            size={18}
            onPress={onDelete}
            disabled={deleting}
            accessibilityLabel="Supprimer la note"
          />
        ) : null}
      </View>
      <Text style={[typography.body, { color: theme.colors.onSurface }]}>{note.body}</Text>
    </View>
  );
}

function formatNoteDate(iso: string): string {
  try {
    return format(new Date(iso), 'EEE d MMM · HH:mm', { locale: fr });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xxs,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recipientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  recipientBtn: {
    borderRadius: radii.button,
  },
  recipientBtnContent: {
    minHeight: 36,
  },
});
