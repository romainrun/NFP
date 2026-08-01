import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { persistProductImage } from '@/features/products/data/productImageStorage';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  label?: string;
  imageUri: string | null;
  onChange: (uri: string | null) => void;
};

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return requested.granted;
}

export function LogoImageField({ label = 'Logo', imageUri, onChange }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (!(await ensureLibraryPermission())) {
      Alert.alert('Permission', 'Accès à la galerie requis.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setBusy(true);
    try {
      const persisted = await persistProductImage(result.assets[0].uri);
      onChange(persisted);
    } catch (error) {
      Alert.alert(
        'Image',
        error instanceof Error ? error.message : 'Impossible d’ajouter l’image',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.row}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View
            style={[styles.preview, styles.placeholder, { borderColor: theme.colors.outline }]}
          />
        )}
        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => void pick()} loading={busy} compact>
            Choisir
          </Button>
          {imageUri ? (
            <Button mode="text" onPress={() => onChange(null)} compact>
              Supprimer
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  preview: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    gap: spacing.xxs,
  },
});
