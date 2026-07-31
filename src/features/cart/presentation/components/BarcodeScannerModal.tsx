import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

export function BarcodeScannerModal({ visible, onClose, onScan }: Props) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanAt = useRef(0);
  const lastCode = useRef('');
  const [hint, setHint] = useState('Cadrez le code-barres');

  useEffect(() => {
    if (visible) {
      lastCode.current = '';
      setHint('Cadrez le code-barres');
    }
  }, [visible]);

  const handleBarcode = ({ data }: { data: string }) => {
    const code = data.trim();
    if (!code) return;
    const now = Date.now();
    if (code === lastCode.current && now - lastScanAt.current < 1600) return;
    lastCode.current = code;
    lastScanAt.current = now;
    setHint(`Lu : ${code}`);
    onScan(code);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.h2, { color: theme.colors.onSurface, flex: 1 }]}>
            Scanner
          </Text>
          <Button mode="outlined" onPress={onClose}>
            Fermer
          </Button>
        </View>

        {!permission?.granted ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
              Autorisez la caméra pour scanner les codes-barres produits.
            </Text>
            <Button mode="contained" onPress={() => void requestPermission()}>
              Autoriser la caméra
            </Button>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                ],
              }}
              onBarcodeScanned={handleBarcode}
            />
            <View style={styles.overlay}>
              <View style={[styles.frame, { borderColor: theme.colors.primary }]} />
              <Text style={[typography.bodyStrong, { color: '#fff' }]}>{hint}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  cameraWrap: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  frame: {
    width: '72%',
    aspectRatio: 1.6,
    borderWidth: 3,
    borderRadius: radii.md,
  },
});
