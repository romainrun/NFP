import { Vibration } from 'react-native';

export function vibrateTap() {
  Vibration.vibrate(28);
}

export function vibrateScan() {
  Vibration.vibrate(70);
}

export function vibrateSuccess() {
  Vibration.vibrate([0, 45, 40, 45]);
}
