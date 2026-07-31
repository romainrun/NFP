import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { persistProductImage } from '@/features/products/data/productImageStorage';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  imageUri: string | null;
  editable: boolean;
  onChange: (uri: string | null) => void;
  /** Compact horizontal layout for dense forms. */
  compact?: boolean;
};

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return requested.granted;
}

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const requested = await ImagePicker.requestCameraPermissionsAsync();
  return requested.granted;
}

export function ProductImageField({
  imageUri,
  editable,
  onChange,
  compact = true,
}: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const applyPickedUri = async (sourceUri: string) => {
    setBusy(true);
    try {
      const persisted = await persistProductImage(sourceUri);
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

  const pickFromLibrary = async () => {
    if (!editable || busy) return;
    const granted = await ensureLibraryPermission();
    if (!granted) {
      Alert.alert('Permission requise', 'Autorisez l’accès aux photos pour illustrer un article.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    await applyPickedUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    if (!editable || busy) return;
    const granted = await ensureCameraPermission();
    if (!granted) {
      Alert.alert('Permission requise', 'Autorisez la caméra pour photographier un article.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    await applyPickedUri(result.assets[0].uri);
  };

  const removeImage = () => {
    if (!editable || busy || !imageUri) return;
    Alert.alert('Retirer l’image', 'Supprimer la photo de cet article ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => onChange(null) },
    ]);
  };

  return (
    <View
      style={[
        compact ? styles.rowBox : styles.box,
        {
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={compact ? styles.thumb : styles.preview}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            compact ? styles.thumb : styles.placeholder,
            { backgroundColor: Colors.section, alignItems: 'center', justifyContent: 'center' },
          ]}
        >
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>Photo</Text>
        </View>
      )}

      <View style={compact ? styles.sideActions : styles.actions}>
        <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
          Photo produit
        </Text>
        {editable ? (
          <View style={styles.actions}>
            <Button compact mode="contained-tonal" loading={busy} onPress={() => void pickFromLibrary()}>
              Galerie
            </Button>
            <Button compact mode="contained-tonal" loading={busy} onPress={() => void takePhoto()}>
              Caméra
            </Button>
            {imageUri ? (
              <Button
                compact
                mode="text"
                textColor={theme.colors.error}
                disabled={busy}
                onPress={removeImage}
              >
                Retirer
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.sm,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 200,
    borderRadius: radii.sm,
    alignSelf: 'center',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1.6,
    maxHeight: 140,
    borderRadius: radii.sm,
  },
  sideActions: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
});
