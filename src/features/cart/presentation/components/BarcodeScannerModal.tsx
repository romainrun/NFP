import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

type ScanPoint = { x: number; y: number };
type ScanBounds = {
  origin?: ScanPoint;
  size?: { width: number; height: number };
};
type BarcodeEvent = {
  data: string;
  bounds?: ScanBounds;
  cornerPoints?: ScanPoint[];
};

const FRAME_WIDTH_RATIO = 0.72;
const FRAME_ASPECT_RATIO = 1.6;
const FRAME_TOLERANCE_RATIO = 0.18;

export function BarcodeScannerModal({ visible, onClose, onScan }: Props) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanAt = useRef(0);
  const lastCode = useRef('');
  const [hint, setHint] = useState('Cadrez le code-barres');
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (visible) {
      lastCode.current = '';
      setHint('Cadrez le code-barres');
    }
  }, [visible]);

  const frameRect = () => {
    const frameWidth = cameraSize.width * FRAME_WIDTH_RATIO;
    const frameHeight = frameWidth / FRAME_ASPECT_RATIO;
    return {
      x: (cameraSize.width - frameWidth) / 2,
      y: (cameraSize.height - frameHeight) / 2,
      width: frameWidth,
      height: frameHeight,
    };
  };

  const normalizePoint = (point: ScanPoint): ScanPoint => {
    if (point.x <= 1 && point.y <= 1) {
      return { x: point.x * cameraSize.width, y: point.y * cameraSize.height };
    }
    return point;
  };

  const isPointInsideFrame = (point: ScanPoint) => {
    const rect = frameRect();
    const tolerance = rect.width * FRAME_TOLERANCE_RATIO;
    return (
      point.x >= rect.x - tolerance &&
      point.x <= rect.x + rect.width + tolerance &&
      point.y >= rect.y - tolerance &&
      point.y <= rect.y + rect.height + tolerance
    );
  };

  const pointsLookLikePreviewCoordinates = (points: ScanPoint[]) => {
    // Some devices expose camera-buffer coordinates instead of preview
    // coordinates; those cannot be compared reliably, so keep scanning usable.
    const tolerance = Math.max(cameraSize.width, cameraSize.height) * 0.12;
    return points.every(
      (point) =>
        point.x >= -tolerance &&
        point.y >= -tolerance &&
        point.x <= cameraSize.width + tolerance &&
        point.y <= cameraSize.height + tolerance,
    );
  };

  const centerOfPoints = (points: ScanPoint[]): ScanPoint => {
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  };

  const barcodePoints = (event: BarcodeEvent): ScanPoint[] | null => {
    if (!cameraSize.width || !cameraSize.height) return null;

    if (event.bounds?.origin && event.bounds?.size) {
      const { origin, size } = event.bounds;
      return [
        normalizePoint(origin),
        normalizePoint({ x: origin.x + size.width, y: origin.y }),
        normalizePoint({ x: origin.x, y: origin.y + size.height }),
        normalizePoint({ x: origin.x + size.width, y: origin.y + size.height }),
      ];
    }

    if (event.cornerPoints?.length) {
      return event.cornerPoints.map(normalizePoint);
    }

    // Some platforms do not expose scan coordinates. Keep scanning functional.
    return null;
  };

  const handleBarcode = (event: BarcodeEvent) => {
    const { data } = event;
    const code = data.trim();
    if (!code) return;
    const points = barcodePoints(event);
    if (
      points &&
      pointsLookLikePreviewCoordinates(points) &&
      !isPointInsideFrame(centerOfPoints(points))
    ) {
      setHint('Centrez le code dans le cadre');
      return;
    }
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
          <View
            style={styles.cameraWrap}
            onLayout={(event: LayoutChangeEvent) => {
              const { width, height } = event.nativeEvent.layout;
              setCameraSize({ width, height });
            }}
          >
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
    width: `${FRAME_WIDTH_RATIO * 100}%`,
    aspectRatio: FRAME_ASPECT_RATIO,
    borderWidth: 3,
    borderRadius: radii.md,
  },
});
