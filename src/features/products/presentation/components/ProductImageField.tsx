import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { persistProductImage } from '@/features/products/data/productImageStorage';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  imageUri: string | null;
  editable: boolean;
  onChange: (uri: string | null) => void;
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

export function ProductImageField({ imageUri, editable, onChange }: Props) {
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
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => onChange(null),
      },
    ]);
  };

  return (
    <View
      style={[
        styles.box,
        {
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
        Photo produit
      </Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View
          style={[
            styles.placeholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Aucune image</Text>
        </View>
      )}

      {editable ? (
        <View style={styles.actions}>
          <Button mode="contained-tonal" loading={busy} onPress={() => void pickFromLibrary()}>
            Galerie
          </Button>
          <Button mode="contained-tonal" loading={busy} onPress={() => void takePhoto()}>
            Caméra
          </Button>
          {imageUri ? (
            <Button
              mode="outlined"
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
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: radii.sm,
    alignSelf: 'center',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1.6,
    maxHeight: 180,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
