import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Dialog, Portal, TextInput, useTheme } from 'react-native-paper';
import { Colors } from '@/shared/theme/colors';
import { radii } from '@/shared/theme/spacing';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

export function DatePickerField({ label, value, onChange }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const show = () => {
    setDraft(value);
    setOpen(true);
  };

  const onNativeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'set' && selected) onChange(selected);
      return;
    }
    if (selected) setDraft(selected);
  };

  return (
    <>
      <Pressable onPress={show} accessibilityRole="button" style={styles.root}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            dense
            label={label}
            value={format(value, 'EEEE d MMMM yyyy', { locale: fr })}
            editable={false}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            right={<TextInput.Icon icon="calendar" />}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
          />
        </View>
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={onNativeChange}
        />
      ) : null}

      {Platform.OS !== 'android' ? (
        <Portal>
          <Dialog visible={open} onDismiss={() => setOpen(false)}>
            <Dialog.Title>{label}</Dialog.Title>
            <Dialog.Content>
              {open ? (
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="inline"
                  locale="fr-FR"
                  onChange={onNativeChange}
                />
              ) : null}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setOpen(false)}>Annuler</Button>
              <Button
                onPress={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                Valider
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  input: {
    borderRadius: radii.input,
  },
});
